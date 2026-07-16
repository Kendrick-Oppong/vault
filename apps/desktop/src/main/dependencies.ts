/**
 * Dependency checker + auto-downloader for required binaries (yt-dlp, ffmpeg).
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, createWriteStream } from "node:fs";
import { chmod, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { get } from "node:https";
import type { IncomingMessage } from "node:http";

const execFileAsync = promisify(execFile);

const MAX_REDIRECTS = 6;
const REQUEST_TIMEOUT = 300_000;

export interface DependencyStatus {
  installed: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface DependenciesCheckResult {
  ytDlp: DependencyStatus;
  ffmpeg: DependencyStatus;
  allReady: boolean;
  errors: string[];
}

export interface DownloadProgress {
  binary: "ytdlp" | "ffmpeg";
  stage: "checking" | "downloading" | "extracting" | "verifying" | "done" | "error";
  percent: number | null;
  message?: string;
}

// ─── Platform helpers ────────────────────────────────────────────────────────

function platform(): "win32" | "darwin" | "linux" {
  const p = process.platform;
  if (p === "win32" || p === "darwin" || p === "linux") return p;
  throw new Error(`Unsupported platform: ${p}`);
}

function exe(name: string): string {
  return platform() === "win32" ? `${name}.exe` : name;
}

// ─── File download (https, redirect-following, progress) ─────────────────────

function downloadFile(
  url: string,
  dest: string,
  onProgress?: (downloaded: number, total: number | null) => void,
  depth = 0
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (depth > MAX_REDIRECTS) return reject(new Error(`Too many redirects: ${url}`));

    const req = get(url, { headers: { "User-Agent": "Vault-Desktop" } }, (res: IncomingMessage) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        downloadFile(next, dest, onProgress, depth + 1).then(resolve, reject);
        return;
      }
      if (status !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${status} for ${url}`));
      }
      const total = Number(res.headers["content-length"]) || null;
      let downloaded = 0;
      const file = createWriteStream(dest);
      res.on("data", (chunk: Buffer) => {
        downloaded += chunk.length;
        onProgress?.(downloaded, total);
      });
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
      file.on("error", reject);
      res.on("error", reject);
    });
    req.setTimeout(REQUEST_TIMEOUT, () => req.destroy(new Error(`Timeout: ${url}`)));
    req.on("error", reject);
  });
}

// ─── Archive extraction ───────────────────────────────────────────────────────

async function extractZipWindows(archivePath: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path '${archivePath}' -DestinationPath '${dest}' -Force`
    ],
    { timeout: 120_000 }
  );
}

async function extractTar(archivePath: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  // Node's built-in `tar` module isn't available; use system tar (present on macOS/Linux)
  await execFileAsync("tar", ["-xf", archivePath, "-C", dest], { timeout: 120_000 });
}

async function findBinary(root: string, name: string): Promise<string | null> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      const found = await findBinary(full, name);
      if (found) return found;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

// ─── Dependency check ─────────────────────────────────────────────────────────

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function checkYtDlp(binaryPath: string): Promise<DependencyStatus> {
  try {
    if (!existsSync(binaryPath))
      return { installed: false, error: `yt-dlp not found at: ${binaryPath}` };
    const { stdout } = await execFileAsync(binaryPath, ["--version"], { timeout: 15_000 });
    return { installed: true, version: stdout.trim(), path: binaryPath };
  } catch (err) {
    return {
      installed: false,
      error: `Failed to run yt-dlp: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

async function checkFfmpeg(binaryPath: string): Promise<DependencyStatus> {
  try {
    if (!existsSync(binaryPath))
      return { installed: false, error: `ffmpeg not found at: ${binaryPath}` };
    const { stdout } = await execFileAsync(binaryPath, ["-version"], { timeout: 15_000 });
    const match = new RegExp(/ffmpeg version (\S+)/).exec(stdout);
    return {
      installed: true,
      version: match ? match[1] : stdout.split("\n")[0]?.trim(),
      path: binaryPath
    };
  } catch (err) {
    return {
      installed: false,
      error: `Failed to run ffmpeg: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

export async function checkDependencies(
  ytDlpPath: string,
  ffmpegPath: string
): Promise<DependenciesCheckResult> {
  const [ytDlp, ffmpeg] = await Promise.all([checkYtDlp(ytDlpPath), checkFfmpeg(ffmpegPath)]);
  const errors: string[] = [];
  if (!ytDlp.installed) errors.push(ytDlp.error || "yt-dlp is not installed");
  if (!ffmpeg.installed) errors.push(ffmpeg.error || "ffmpeg is not installed");
  return { ytDlp, ffmpeg, allReady: ytDlp.installed && ffmpeg.installed, errors };
}

export function getDependencyErrorMessage(status: DependenciesCheckResult): string {
  return status.errors.join("\n");
}

// ─── Auto-download ────────────────────────────────────────────────────────────

const YTDLP_URLS: Record<string, string> = {
  win32: "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
  darwin: "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
  linux: "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
};

type FfmpegSource = { url: string; archive: "zip" | "tar" };
const FFMPEG_SOURCES: Record<string, FfmpegSource[]> = {
  win32: [
    {
      url: "https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip",
      archive: "zip"
    }
  ],
  linux: [
    {
      url: "https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-linux64-gpl.tar.xz",
      archive: "tar"
    }
  ],
  darwin: [
    { url: "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip", archive: "zip" },
    { url: "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip", archive: "zip" }
  ]
};

async function ensureYtDlp(
  destDir: string,
  onProgress: (p: DownloadProgress) => void
): Promise<void> {
  const p = platform();
  const destPath = join(destDir, exe("yt-dlp"));

  onProgress({ binary: "ytdlp", stage: "checking", percent: null });
  if (await fileExists(destPath)) {
    onProgress({ binary: "ytdlp", stage: "done", percent: 100 });
    return;
  }

  const url = YTDLP_URLS[p];
  onProgress({ binary: "ytdlp", stage: "downloading", percent: 0 });
  await downloadFile(url, destPath, (dl, total) => {
    onProgress({
      binary: "ytdlp",
      stage: "downloading",
      percent: total ? Math.round((dl / total) * 100) : null
    });
  });

  if (p !== "win32") await chmod(destPath, 0o755);

  onProgress({ binary: "ytdlp", stage: "verifying", percent: null });
  const { stdout } = await execFileAsync(destPath, ["--version"], { timeout: 15_000 });
  if (!stdout.trim()) throw new Error("yt-dlp downloaded but failed verification");

  onProgress({ binary: "ytdlp", stage: "done", percent: 100 });
}

async function ensureFfmpeg(
  destDir: string,
  onProgress: (p: DownloadProgress) => void
): Promise<void> {
  const p = platform();
  const ffmpegDest = join(destDir, exe("ffmpeg"));

  onProgress({ binary: "ffmpeg", stage: "checking", percent: null });
  if (await fileExists(ffmpegDest)) {
    onProgress({ binary: "ffmpeg", stage: "done", percent: 100 });
    return;
  }

  const sources = FFMPEG_SOURCES[p];
  const extractDir = join(destDir, "_ffmpeg_extract");

  try {
    await rm(extractDir, { recursive: true, force: true });

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const archivePath = join(
        destDir,
        `ffmpeg-dl-${i}.${source.archive === "zip" ? "zip" : "tar.xz"}`
      );

      onProgress({ binary: "ffmpeg", stage: "downloading", percent: 0 });
      await downloadFile(source.url, archivePath, (dl, total) => {
        onProgress({
          binary: "ffmpeg",
          stage: "downloading",
          percent: total ? Math.round((dl / total) * 100) : null
        });
      });

      onProgress({ binary: "ffmpeg", stage: "extracting", percent: null });
      if (source.archive === "zip" && p === "win32") {
        await extractZipWindows(archivePath, extractDir);
      } else {
        await extractTar(archivePath, extractDir);
      }
      await rm(archivePath, { force: true });
    }

    for (const name of [exe("ffmpeg"), exe("ffprobe")]) {
      const found = await findBinary(extractDir, name);
      if (found) {
        const out = join(destDir, name);
        await rm(out, { force: true });
        await rename(found, out);
        if (p !== "win32") await chmod(out, 0o755);
      }
    }

    onProgress({ binary: "ffmpeg", stage: "verifying", percent: null });
    const { stdout } = await execFileAsync(ffmpegDest, ["-version"], { timeout: 15_000 });
    if (!stdout.trim()) throw new Error("ffmpeg downloaded but failed verification");

    onProgress({ binary: "ffmpeg", stage: "done", percent: 100 });
  } finally {
    await rm(extractDir, { recursive: true, force: true });
  }
}

/**
 * Auto-download yt-dlp + ffmpeg into destDir.
 * Pure Node — no PowerShell script, no ChromeCookieUnlock, cross-platform.
 */
export async function downloadDependencies(
  destDir: string,
  onProgress: (progress: DownloadProgress) => void
): Promise<void> {
  await mkdir(destDir, { recursive: true });
  await ensureYtDlp(destDir, onProgress);
  await ensureFfmpeg(destDir, onProgress);
}
