import { spawn, type ChildProcess } from "node:child_process";
import type { YtDlpProgress, DownloadExtras } from "@vault/types";
import { validateYouTubeUrl } from "./validators";
import { logger } from "./logger";

export interface YtDlpOptions {
  binaryPath: string;
  ffmpegPath: string;
  pluginPath?: string;
}

export interface ProbeOptions extends DownloadExtras {
  retries?: number;
  timeout?: number;
  playlistLimit?: number;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRIES = 2;

// Lossless formats where a target bitrate doesn't apply.
const LOSSLESS_AUDIO_FORMATS = new Set(["flac", "wav"]);

// yt-dlp supports thumbnail embedding in these containers only.
const THUMBNAIL_SUPPORTED_FORMATS = new Set([
  "mp3",
  "m4a",
  "opus",
  "flac",
  "mkv",
  "mka",
  "ogg",
  "mp4",
  "m4v",
  "mov"
]);

// itag codes for webm-only YouTube formats; thumbnail embedding isn't supported for webm.
const WEBM_FORMAT_CODES = new Set([
  133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 160, 167, 168, 169, 170, 217, 218, 219,
  222, 223, 224, 242, 243, 244, 245, 246, 247, 248, 256, 257, 258, 271, 272, 278, 298, 299, 302, 303
]);

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
  timeout = DEFAULT_TIMEOUT,
  playlistLimit?: number
): Promise<Record<string, unknown>[]> {
  logger.debug("Probing formats for:", url, playlistLimit ? `with limit ${playlistLimit}` : "");
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

    // Add playlist items limit if specified
    if (playlistLimit && playlistLimit > 0) {
      args.push("--playlist-items", `1:${playlistLimit}`);
    }

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
      if (timedOut) {
        logger.warn(`yt-dlp probe timed out after ${timeout}ms for:`, url);
        return reject(new Error(`yt-dlp probe timed out after ${timeout}ms`));
      }
      if (code !== 0) {
        logger.error(`yt-dlp probe failed for:`, url, parseYtDlpError(stderr) || stderr);
        return reject(new Error(`yt-dlp probe failed: ${parseYtDlpError(stderr) || stderr}`));
      }
      try {
        const lines = stdout
          .trim()
          .split("\n")
          .filter((l) => l.trim());
        if (lines.length === 0) {
          logger.warn("yt-dlp returned no data for:", url);
          return reject(new Error("yt-dlp returned no data"));
        }
        logger.debug("Probe successful for:", url, `(${lines.length} formats)`);
        resolve(lines.map((line) => JSON.parse(line)));
      } catch (err) {
        logger.error("Failed to parse yt-dlp output for:", url, err);
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
      return await probeInternal(opts, url, extras, timeout, extras?.playlistLimit);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(
          `Probe failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms:`,
          lastError.message
        );
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  logger.error(`Probe failed after ${retries + 1} attempts for:`, url, lastError?.message);
  throw new Error(`yt-dlp probe failed after ${retries + 1} attempts: ${lastError?.message}`);
}

// ---- download() helpers -----------------------------------------------
function buildMediaArgs(args: string[], extras: DownloadExtras | undefined): void {
  if (extras?.audioFormat) {
    args.push("--extract-audio", "--audio-format", extras.audioFormat);
    // When extracting audio, we don't need the format selector for video —
    // just use bestaudio to get the best quality audio.
    const formatIndex = args.indexOf("--format");
    if (formatIndex !== -1 && args[formatIndex + 1]) {
      args[formatIndex + 1] = "bestaudio";
    }
    return;
  }
  const container = extras?.videoContainer || "mp4";
  args.push("--merge-output-format", container, "--remux-video", container);
  logger.debug("Video container set to:", container);
}

function buildAuthAndNetworkArgs(args: string[], extras: DownloadExtras | undefined): void {
  if (extras?.cookiesFile) {
    args.push("--cookies", extras.cookiesFile);
    logger.debug("Using cookies file:", extras.cookiesFile);
  } else if (extras?.cookiesFromBrowser) {
    args.push("--cookies-from-browser", extras.cookiesFromBrowser);
    logger.debug("Using cookies from browser:", extras.cookiesFromBrowser);
  }
  if (extras?.rateLimit) {
    args.push("--limit-rate", extras.rateLimit);
    logger.debug("Rate limit:", extras.rateLimit);
  }
  if (extras?.proxy) {
    args.push("--proxy", extras.proxy);
    logger.debug("Proxy:", extras.proxy);
  }
  if (extras?.geoBypass) {
    args.push("--geo-bypass");
    logger.debug("Geo bypass enabled");
  }
}

function containsWebmFormatCode(formatSelector: string): boolean {
  const numericTokens = formatSelector.match(/\d+/g) ?? [];
  return numericTokens.some((token) => WEBM_FORMAT_CODES.has(Number(token)));
}

function isWebmFormatSelector(formatSelector: string): boolean {
  return formatSelector.includes("webm") || containsWebmFormatCode(formatSelector);
}

function resolveAudioFormat(
  formatSelector: string,
  isAudio: boolean,
  explicitFormat?: string
): string {
  if (explicitFormat) return explicitFormat;
  if (!isAudio) return formatSelector;
  return (/mp3|m4a|opus|flac|wav/i.exec(formatSelector)?.[0] ?? "mp3").toLowerCase();
}

function canEmbedThumbnail(
  formatSelector: string,
  audioFormat: string,
  videoContainer: string
): boolean {
  if (isWebmFormatSelector(formatSelector)) return false;
  return (
    THUMBNAIL_SUPPORTED_FORMATS.has(audioFormat) || THUMBNAIL_SUPPORTED_FORMATS.has(videoContainer)
  );
}

function buildThumbnailAndMetadataArgs(
  args: string[],
  extras: DownloadExtras | undefined,
  formatSelector: string,
  audioFormat: string,
  videoContainer: string
): void {
  const embeddable = canEmbedThumbnail(formatSelector, audioFormat, videoContainer);

  if (extras?.audioBitrate && !LOSSLESS_AUDIO_FORMATS.has(audioFormat)) {
    args.push("--audio-quality", `${extras.audioBitrate}K`);
    logger.debug("Audio bitrate set to:", extras.audioBitrate, "kbps");
  }

  if (embeddable && extras?.embedThumbnail) {
    args.push("--embed-thumbnail", "--ppa", "EmbedThumbnail:-c copy");
    logger.debug("Thumbnail embedding enabled");
  } else if (extras?.embedThumbnail && !embeddable) {
    logger.debug(
      "Thumbnail embedding disabled: unsupported format (webm or other unsupported container)"
    );
  }
  if (extras?.embedMetadata) {
    args.push("--embed-metadata");
    logger.debug("Metadata embedding enabled");
  }
  if (extras?.embedChapters) {
    args.push("--embed-chapters");
    logger.debug("Chapter embedding enabled");
  }
  if (extras?.sponsorBlock) {
    args.push("--sponsorblock-remove", "default");
    logger.debug("SponsorBlock removal enabled");
  }
}

function buildSubtitleAndArchiveArgs(args: string[], extras: DownloadExtras | undefined): void {
  if (extras?.subtitles === "external") {
    args.push("--write-subs", "--write-auto-subs");
    if (extras.subtitleLanguages && extras.subtitleLanguages.length > 0) {
      args.push("--sub-langs", extras.subtitleLanguages.join(","));
      logger.debug("External subtitles enabled, languages:", extras.subtitleLanguages);
    } else {
      logger.debug("External subtitles enabled (all languages)");
    }
  }
  if (extras?.useDownloadArchive) {
    args.push("--download-archive", "archive.txt");
    logger.debug("Download archive enabled");
  }
}

function attachDownloadOutputHandlers(
  proc: ChildProcess,
  onProgress?: (progress: YtDlpProgress) => void
): { getStderr: () => string; getStdoutInfo: () => string } {
  let stderr = "";
  let stdoutInfo = "";

  proc.stdout?.on("data", (chunk) => {
    for (const line of chunk.toString().split("\n")) {
      if (!line.trim()) continue;
      try {
        const progress = JSON.parse(line) as YtDlpProgress;
        logger.debug("Download progress:", progress);
        onProgress?.(progress);
      } catch {
        stdoutInfo += line + "\n";
      }
    }
  });

  proc.stderr?.on("data", (chunk) => {
    const data = chunk.toString();
    stderr += data;
    logger.debug("yt-dlp stderr:", data.trim());
  });

  return { getStderr: () => stderr, getStdoutInfo: () => stdoutInfo };
}

function createDownloadCompletionPromise(
  proc: ChildProcess,
  url: string,
  getStderr: () => string,
  getStdoutInfo: () => string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) {
        logger.info("Download completed successfully:", url);
        resolve();
        return;
      }
      const stderr = getStderr();
      // Extract only actual ERROR lines from stderr, ignore warnings
      const errorLines = stderr
        .split("\n")
        .filter((line) => line.trim().startsWith("ERROR:"))
        .map((line) => line.replace("ERROR:", "").trim());
      const errorMsg = errorLines.length > 0 ? errorLines.join("\n") : parseYtDlpError(stderr);
      logger.error("Download failed:", url, `code ${code}`, errorMsg);
      const details = [errorMsg || stderr.trim(), getStdoutInfo().trim()]
        .filter(Boolean)
        .join("\n");
      const err = new Error(`yt-dlp download failed (code ${code}): ${details}`) as Error & {
        stderr?: string;
      };
      err.stderr = details;
      reject(err);
    });
    proc.on("error", reject);
  });
}

// -------------------------------------------------------------------------

export function download(
  opts: YtDlpOptions,
  url: string,
  outputTemplate: string,
  formatSelector: string,
  extras?: DownloadExtras,
  onProgress?: (progress: YtDlpProgress) => void,
  resume?: boolean
): { process: ChildProcess; promise: Promise<void> } {
  logger.info("Starting download:", url, resume ? "(resume)" : "");
  logger.debug("Download options:", { formatSelector, outputTemplate, resume, extras });

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

  buildMediaArgs(args, extras);

  if (resume) {
    args.push("--continue");
    logger.debug("Resume mode enabled");
  }
  if (opts.pluginPath) {
    args.push("--plugin-dirs", opts.pluginPath);
    logger.debug("Plugin path:", opts.pluginPath);
  }

  buildAuthAndNetworkArgs(args, extras);

  const isAudio = formatSelector.includes("bestaudio") || formatSelector.includes("audio");
  const audioFormat = resolveAudioFormat(formatSelector, isAudio, extras?.audioFormat);
  const videoContainer = extras?.videoContainer || "mp4";

  logger.debug("Media type detection:", {
    isAudio,
    audioFormat,
    videoContainer,
    isWebmFormat: isWebmFormatSelector(formatSelector),
    canEmbedThumbnail: canEmbedThumbnail(formatSelector, audioFormat, videoContainer)
  });

  buildThumbnailAndMetadataArgs(args, extras, formatSelector, audioFormat, videoContainer);
  buildSubtitleAndArchiveArgs(args, extras);

  args.push(url);
  logger.debug("Final yt-dlp command:", args.join(" "));

  const proc = spawn(opts.binaryPath, args, {
    shell: false,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const { getStderr, getStdoutInfo } = attachDownloadOutputHandlers(proc, onProgress);
  const promise = createDownloadCompletionPromise(proc, url, getStderr, getStdoutInfo);

  return { process: proc, promise };
}

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
