import { spawn, type ChildProcess } from "node:child_process";
import type { YtDlpProgress, DownloadExtras } from "@vault/types";
import { validateYouTubeUrl } from "./validators";

export interface YtDlpOptions {
  binaryPath: string;
  ffmpegPath: string;
  pluginPath?: string;
}

export interface ProbeOptions extends DownloadExtras {
  retries?: number;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRIES = 2;

function parseYtDlpError(stderr: string): string {
  if (!stderr) return "";
  if (stderr.includes("ERROR: Requested format is not available"))
    return "Requested format is not available for this video. Try a different format.";
  if (stderr.includes("ERROR: Sign in to confirm"))
    return "Video requires sign-in. Please enable cookies or use YouTube auth.";
  if (stderr.includes("ERROR: This live event will begin in"))
    return "This is a live event that hasn't started yet.";
  if (stderr.includes("ERROR: This video is age restricted"))
    return "Video is age-restricted. Enable cookies or sign in to access it.";
  if (stderr.includes("HTTP Error 403"))
    return "Access forbidden. The video may be private or unavailable in your region.";
  if (stderr.includes("HTTP Error 404"))
    return "Video not found. It may have been deleted or the URL is incorrect.";
  if (stderr.includes("Connection refused"))
    return "Connection failed. Check your internet connection.";
  return stderr.split("\n")[0]?.trim() || stderr.slice(0, 200);
}

function probeInternal(
  opts: YtDlpOptions,
  url: string,
  extras?: DownloadExtras,
  timeout = DEFAULT_TIMEOUT
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const args = [
      "--dump-json",
      "--flat-playlist",
      "--js-runtimes",
      `node:${process.execPath}`,
      "--quiet",
      "--no-warnings"
    ];

    if (opts.pluginPath) args.push("--plugin-dirs", opts.pluginPath);
    if (extras?.cookiesFile) args.push("--cookies", extras.cookiesFile);
    else if (extras?.cookiesFromBrowser)
      args.push("--cookies-from-browser", extras.cookiesFromBrowser);
    args.push(url);

    const proc = spawn(opts.binaryPath, args, {
      shell: false,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      timeout
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
    }, timeout);

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeoutHandle);
      if (timedOut) return reject(new Error(`yt-dlp probe timed out after ${timeout}ms`));
      if (code !== 0)
        return reject(new Error(`yt-dlp probe failed: ${parseYtDlpError(stderr) || stderr}`));
      try {
        const lines = stdout
          .trim()
          .split("\n")
          .filter((l) => l.trim());
        if (lines.length === 0) return reject(new Error("yt-dlp returned no data"));
        resolve(lines.map((line) => JSON.parse(line)));
      } catch (err) {
        reject(
          new Error(
            `Failed to parse yt-dlp output: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeoutHandle);
      reject(err);
    });
  });
}

export async function probeFormats(
  opts: YtDlpOptions,
  url: string,
  extras?: ProbeOptions
): Promise<Record<string, unknown>[]> {
  const validation = validateYouTubeUrl(url);
  if (!validation.valid) throw new Error(`Invalid YouTube URL: ${validation.error}`);

  const retries = extras?.retries ?? DEFAULT_RETRIES;
  const timeout = extras?.timeout ?? DEFAULT_TIMEOUT;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await probeInternal(opts, url, extras, timeout);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `[yt-dlp] Probe failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms: ${lastError.message}`
        );
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  throw new Error(`yt-dlp probe failed after ${retries + 1} attempts: ${lastError?.message}`);
}

export function download(
  opts: YtDlpOptions,
  url: string,
  outputTemplate: string,
  formatSelector: string,
  extras?: DownloadExtras,
  onProgress?: (progress: YtDlpProgress) => void,
  resume?: boolean
): { process: ChildProcess; promise: Promise<void> } {
  const args = [
    "--ffmpeg-location",
    opts.ffmpegPath,
    "--output",
    outputTemplate,
    "--format",
    formatSelector,
    "--newline",
    "--progress-template",
    "%(progress)j",
    "--js-runtimes",
    `node:${process.execPath}`,
    "--prefer-free-formats",
    "--no-warnings"
  ];

  // Use container from extras if provided, otherwise use mkv as default
  const container = extras?.videoContainer || "mkv";
  args.push("--merge-output-format", container);

  if (resume) {
    args.push("--continue");
  }

  if (opts.pluginPath) args.push("--plugin-dirs", opts.pluginPath);
  if (extras?.cookiesFile) args.push("--cookies", extras.cookiesFile);
  else if (extras?.cookiesFromBrowser)
    args.push("--cookies-from-browser", extras.cookiesFromBrowser);
  if (extras?.rateLimit) args.push("--limit-rate", extras.rateLimit);
  if (extras?.proxy) args.push("--proxy", extras.proxy);
  if (extras?.geoBypass) args.push("--geo-bypass");
  if (extras?.embedThumbnail) args.push("--embed-thumbnail", "--ppa", "EmbedThumbnail:-c copy");
  if (extras?.embedMetadata) args.push("--embed-metadata");
  if (extras?.embedChapters) args.push("--embed-chapters");
  if (extras?.sponsorBlock) args.push("--sponsorblock-remove", "default");
  if (extras?.subtitles === "external") {
    args.push("--write-subs");
    if (extras.subtitleLanguages && extras.subtitleLanguages.length > 0) {
      args.push("--sub-langs", extras.subtitleLanguages.join(","));
    }
  } else if (extras?.subtitles === "burned") args.push("--embed-subs");
  if (extras?.downloadArchive) args.push("--download-archive", extras.downloadArchive);
  args.push(url);

  const proc = spawn(opts.binaryPath, args, {
    shell: false,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  let stdoutInfo = "";

  proc.stdout.on("data", (chunk) => {
    for (const line of chunk.toString().split("\n")) {
      if (!line.trim()) continue;
      try {
        onProgress?.(JSON.parse(line) as YtDlpProgress);
      } catch {
        stdoutInfo += line + "\n";
      }
    }
  });

  proc.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const promise = new Promise<void>((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      // Extract only actual ERROR lines from stderr, ignore warnings
      const errorLines = stderr
        .split("\n")
        .filter((line) => line.trim().startsWith("ERROR:"))
        .map((line) => line.replace("ERROR:", "").trim());
      const errorMsg = errorLines.length > 0 ? errorLines.join("\n") : parseYtDlpError(stderr);
      const details = [errorMsg || stderr.trim(), stdoutInfo.trim()].filter(Boolean).join("\n");
      const err = new Error(`yt-dlp download failed (code ${code}): ${details}`) as Error & {
        stderr?: string;
      };
      err.stderr = details;
      reject(err);
    });
    proc.on("error", reject);
  });

  return { process: proc, promise };
}

/** Legacy compat: factory that returns an object with the same shape as the old class */
export function createYtDlpManager(opts: YtDlpOptions) {
  return {
    probeFormats: (url: string, extras?: ProbeOptions) => probeFormats(opts, url, extras),
    download: (
      url: string,
      outputTemplate: string,
      formatSelector: string,
      extras?: DownloadExtras,
      onProgress?: (progress: YtDlpProgress) => void,
      resume?: boolean
    ) => download(opts, url, outputTemplate, formatSelector, extras, onProgress, resume)
  };
}

export type YtDlpManager = ReturnType<typeof createYtDlpManager>;
