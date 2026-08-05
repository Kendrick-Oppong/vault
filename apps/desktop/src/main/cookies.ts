/**
 * Browser cookie detection, cached export, and yt-dlp flag helpers.
 */
import { app } from "electron";
import { existsSync, statSync, unlinkSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

export interface DetectedBrowser {
  /** yt-dlp identifier, e.g. 'chrome'. */
  name: string;
  label: string;
}

export interface CookieInfo {
  /** Selected browser ('auto', a browser name, or '' when disabled). */
  browser: string;
  /** Concrete browser cookies resolve to (auto picks the first installed). */
  effectiveBrowser: string | null;
  /** Human-friendly label for effectiveBrowser, e.g. 'Google Chrome'. */
  effectiveLabel: string | null;
  /** True when a non-empty cookies cache file exists. */
  cached: boolean;
  /** Age of the cache in milliseconds, or null when absent. */
  ageMs: number | null;
  /** Browsers detected on this machine. */
  detected: DetectedBrowser[];
}

/** Per-platform browser → data-directory probes. */
const BROWSER_PATHS: Record<string, Record<string, () => string>> = {
  win32: {
    edge: () => join(process.env.LOCALAPPDATA || "", "Microsoft", "Edge", "User Data"),
    chrome: () => join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data"),
    firefox: () => join(process.env.APPDATA || "", "Mozilla", "Firefox", "Profiles"),
    opera: () => join(process.env.APPDATA || "", "Opera Software", "Opera Stable"),
    brave: () =>
      join(process.env.LOCALAPPDATA || "", "BraveSoftware", "Brave-Browser", "User Data"),
    vivaldi: () => join(process.env.LOCALAPPDATA || "", "Vivaldi", "User Data")
  },
  darwin: {
    chrome: () => join(homedir(), "Library", "Application Support", "Google", "Chrome"),
    safari: () => join(homedir(), "Library", "Safari"),
    firefox: () => join(homedir(), "Library", "Application Support", "Firefox", "Profiles"),
    opera: () => join(homedir(), "Library", "Application Support", "com.operasoftware.Opera"),
    brave: () =>
      join(homedir(), "Library", "Application Support", "BraveSoftware", "Brave-Browser"),
    vivaldi: () => join(homedir(), "Library", "Application Support", "Vivaldi"),
    edge: () => join(homedir(), "Library", "Application Support", "Microsoft Edge")
  },
  linux: {
    chrome: () => join(homedir(), ".config", "google-chrome"),
    firefox: () => join(homedir(), ".mozilla", "firefox"),
    chromium: () => join(homedir(), ".config", "chromium"),
    opera: () => join(homedir(), ".config", "opera"),
    brave: () => join(homedir(), ".config", "BraveSoftware", "Brave-Browser"),
    vivaldi: () => join(homedir(), ".config", "vivaldi"),
    edge: () => join(homedir(), ".config", "microsoft-edge")
  }
};

/** Preferred probe order per platform. */
const BROWSER_ORDER: Record<string, string[]> = {
  win32: ["vivaldi", "brave", "firefox", "chrome", "edge", "opera"],
  darwin: ["chrome", "safari", "firefox", "brave", "vivaldi", "opera", "edge"],
  linux: ["chrome", "firefox", "chromium", "brave", "vivaldi", "opera", "edge"]
};

const LABELS: Record<string, string> = {
  chrome: "Google Chrome",
  edge: "Microsoft Edge",
  firefox: "Firefox",
  opera: "Opera",
  brave: "Brave",
  vivaldi: "Vivaldi",
  safari: "Safari",
  chromium: "Chromium"
};

/** Refresh the cached cookies file once it is older than this (7 days). */
const COOKIES_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/* ── Configured-browser tracking ─────────────────────────────────────────
 * The concrete browser cookies should be pulled from. Resolved once when the
 * user picks/refreshes a browser, then reused for background refreshes so the
 * download path never needs to know about the raw user setting.            */
let configuredBrowser: string | null = null;

export function setConfiguredBrowser(browserSetting: string | null): void {
  configuredBrowser = effectiveBrowser(browserSetting);
  logger.debug("Configured cookie browser resolved to:", configuredBrowser);
}

export function getConfiguredBrowser(): string | null {
  return configuredBrowser;
}

/** Return the browsers actually installed on this machine, in probe order. */
export function getInstalledBrowsers(): DetectedBrowser[] {
  logger.debug("Scanning for installed browsers on platform:", process.platform);
  const platformPaths = BROWSER_PATHS[process.platform] || {};
  const order = BROWSER_ORDER[process.platform] || Object.keys(platformPaths);
  const result: DetectedBrowser[] = [];
  for (const name of order) {
    const probe = platformPaths[name];
    if (!probe) continue;
    try {
      const path = probe();
      if (existsSync(path)) {
        result.push({ name, label: LABELS[name] ?? name });
        logger.debug("Found browser:", name, "at", path);
      }
    } catch (err) {
      logger.debug("Error probing browser:", name, err);
    }
  }
  logger.debug("Total detected browsers:", result.length);
  return result;
}

function cookiesFilePath(): string {
  return join(app.getPath("userData"), "youtube-cookies.txt");
}

/** Resolve a browser setting to a concrete browser name, or null. */
function effectiveBrowser(browserSetting: string | null): string | null {
  logger.debug("Resolving effective browser for setting:", browserSetting);
  if (!browserSetting || browserSetting === "") {
    logger.debug("No browser setting provided");
    return null;
  }
  if (browserSetting === "auto") {
    const firstBrowser = getInstalledBrowsers()[0]?.name ?? null;
    logger.debug("Auto-detect resolved to:", firstBrowser);
    return firstBrowser;
  }
  logger.debug("Using explicit browser:", browserSetting);
  return browserSetting;
}

/** Friendly label for a yt-dlp browser id, e.g. 'chrome' → 'Google Chrome'. */
export function browserLabel(name: string | null): string | null {
  if (!name) return null;
  return LABELS[name] ?? name;
}

function cacheAgeMs(): number | null {
  try {
    const stat = statSync(cookiesFilePath());
    const age = stat.size > 0 ? Date.now() - stat.mtimeMs : null;
    logger.debug("Cookie cache age:", age, "ms, size:", stat.size);
    return age;
  } catch (err) {
    logger.debug("Error getting cookie cache age:", err);
    return null;
  }
}

let exportInFlight: Promise<boolean> | null = null;

/** Minimum gap between background export attempts (a locked browser fails fast). */
const EXPORT_COOLDOWN_MS = 60_000;
let lastExportAttempt = 0;

/**
 * Export cookies from a browser into the cached cookies file.
 *
 * ATOMIC: writes to a temp file first and only renames onto the live file once
 * a non-empty result is confirmed. A failed export NEVER destroys a previously
 * working cookies file.
 */
async function exportCookies(
  browser: string,
  ytdlpPath: string,
  ffmpegPath: string
): Promise<boolean> {
  if (exportInFlight) return exportInFlight;

  logger.info("Exporting cookies from browser:", browser);
  const finalPath = cookiesFilePath();
  const tmpPath = `${finalPath}.tmp`;
  const ext = process.platform === "win32" ? ".exe" : "";
  const ytdlpBinary = ytdlpPath.endsWith(ext) ? ytdlpPath : `${ytdlpPath}${ext}`;

  exportInFlight = execFileAsync(
    ytdlpBinary,
    [
      "https://www.youtube.com/watch?v=jNQXAC9IVRw", // positional URL argument to run
      "--cookies-from-browser",
      browser,
      "--cookies",
      tmpPath, // ← write to temp, not the live file
      "--skip-download",
      "--no-warnings",
      "--no-check-certificates",
      "--ffmpeg-location",
      ffmpegPath
    ],
    { timeout: 30000 }
  )
    .then(() => {
      if (existsSync(tmpPath) && statSync(tmpPath).size > 0) {
        renameSync(tmpPath, finalPath); // atomic swap
        logger.info("Exported cookies from", browser);
        return true;
      }
      logger.warn("Cookie export produced an empty file");
      try {
        unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
      return false;
    })
    .catch((err: unknown) => {
      // yt-dlp sometimes writes a usable file even while reporting a warning.
      if (existsSync(tmpPath) && statSync(tmpPath).size > 0) {
        renameSync(tmpPath, finalPath);
        logger.info("Cookie export succeeded despite error");
        return true;
      }
      try {
        unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
      logger.warn("Cookie export failed:", err instanceof Error ? err.message : String(err));
      return false;
    })
    .finally(() => {
      exportInFlight = null;
    });

  return exportInFlight;
}

/** Kick a background refresh without blocking the caller. */
function refreshInBackground(browser: string, ytdlpPath: string, ffmpegPath: string): void {
  // Throttle: a locked browser makes the export fail, and without a cooldown
  // every cookie-free download would re-trigger a doomed attempt.
  if (Date.now() - lastExportAttempt < EXPORT_COOLDOWN_MS) {
    logger.debug("Cookie export cooldown active, skipping refresh");
    return;
  }
  lastExportAttempt = Date.now();
  logger.debug("Triggering background cookie refresh for:", browser);
  void exportCookies(browser, ytdlpPath, ffmpegPath);
}

/**
 * Whether a yt-dlp failure indicates the content actually requires an
 * authenticated session (private, age-restricted, members-only) or that the
 * site is rate-limiting/bot-flagging this client.
 */
export function isAuthRequiredError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const isAuthError =
    /sign in to confirm/i.test(message) ||
    /confirm your age|age[- ]restricted|inappropriate for some users/i.test(message) ||
    /private video/i.test(message) ||
    /members[- ]only|available to (this channel's |)members|join this channel/i.test(message) ||
    /requires payment|purchase/i.test(message) ||
    /not a bot/i.test(message) ||
    /login required|account/i.test(message);
  if (isAuthError) {
    logger.debug("Detected authentication required error:", message);
  }
  return isAuthError;
}

/** Whether the user has configured cookie usage at all. */
export function cookiesEnabled(browserSetting: string | null): boolean {
  return effectiveBrowser(browserSetting) != null;
}

/**
 * Main entry point for the download/probe path.
 *
 * Returns the cookies file path when usable, and triggers a background refresh
 * when the cache is missing or stale. Never blocks the caller.
 */
export function ensureFreshCookies(ytdlpPath: string, ffmpegPath: string): string | null {
  const path = cookiesFilePath();
  const browser = getConfiguredBrowser();
  const age = cacheAgeMs();

  // No browser configured → only use cookies if a file already exists.
  if (!browser) {
    return existsSync(path) ? path : null;
  }

  // Browser configured but no cache yet → start an export; nothing usable now.
  if (age == null) {
    refreshInBackground(browser, ytdlpPath, ffmpegPath);
    return null;
  }

  // Stale → refresh in the background, but keep using the existing file for now.
  if (age > COOKIES_MAX_AGE_MS) {
    refreshInBackground(browser, ytdlpPath, ffmpegPath);
  }
  return path;
}

/** Current cookie cache state for the Settings UI. */
export function getCookieInfo(browserSetting: string | null): CookieInfo {
  const age = cacheAgeMs();
  const resolved = effectiveBrowser(browserSetting);
  return {
    browser: browserSetting ?? "",
    effectiveBrowser: resolved,
    effectiveLabel: browserLabel(resolved),
    cached: age != null,
    ageMs: age,
    detected: getInstalledBrowsers()
  };
}

/**
 * Force a fresh export from the effective browser.
 * Atomic: a failed export keeps the previous cookies intact.
 */
export async function refreshCookies(
  browserSetting: string | null,
  ytdlpPath: string,
  ffmpegPath: string
): Promise<CookieInfo> {
  const browser = effectiveBrowser(browserSetting);
  if (browser) {
    setConfiguredBrowser(browserSetting); // future background refreshes
    await exportCookies(browser, ytdlpPath, ffmpegPath);
  } else {
    setConfiguredBrowser(null);
  }
  return getCookieInfo(browserSetting);
}

/** Delete the cached cookies file. */
export function clearCookies(): void {
  try {
    unlinkSync(cookiesFilePath());
    logger.info("Cleared cached cookies");
  } catch {
    // nothing cached
  }
}

/** Get the path to the cookies file if it exists. */
export function getCookiesPath(): string | null {
  const path = cookiesFilePath();
  return existsSync(path) ? path : null;
}
