import { spawn, type ChildProcess } from "node:child_process";
import { isAbsolute } from "node:path";
import { join } from "node:path";
import type { YtDlpProgress, DownloadExtras } from "@vault/types";
import { validateMediaUrl, validateYouTubeUrl } from "./validators";
import { logger } from "./logger";

export interface YtDlpOptions {
  binaryPath: string;
  ffmpegPath: string;
  pluginPath?: string;
  userDataPath: string;
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
    return "This media requires sign-in. Enable cookies in Settings, then try again.";
  if (stderr.includes("login") || stderr.includes("Login") || stderr.includes("cookies"))
    return "This media may require login cookies. Enable or refresh browser cookies in Settings, then try again.";
  if (stderr.includes("Unsupported URL"))
    return "This URL is not supported by the current yt-dlp extractor.";
  if (stderr.includes("No video could be found"))
    return "No downloadable media was found at this URL.";
  if (stderr.includes("private") || stderr.includes("Private"))
    return "This media appears to be private or unavailable without the right account cookies.";
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
  const validation = validateMediaUrl(url);
  if (!validation.valid) throw new Error(`Invalid media URL: ${validation.error}`);

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

/**
 * Fetch a specific page of playlist items.
 * start and end are 1-based, inclusive, matching yt-dlp's --playlist-items START:END selector.
 */
export async function probePlaylistPage(
  opts: YtDlpOptions,
  url: string,
  start: number,
  end: number,
  extras?: DownloadExtras
): Promise<Record<string, unknown>[]> {
  const validation = validateYouTubeUrl(url);
  if (!validation.valid) throw new Error(`Invalid YouTube URL: ${validation.error}`);

  logger.debug(`Probing playlist page ${start}:${end} for:`, url);
  return new Promise((resolve, reject) => {
    const args = [
      "--dump-json",
      "--flat-playlist",
      "--js-runtimes",
      `node:${process.execPath}`,
      "--quiet",
      "--no-warnings",
      "--playlist-items",
      `${start}:${end}`
    ];

    if (opts.pluginPath) args.push("--plugin-dirs", opts.pluginPath);
    if (extras?.cookiesFile) args.push("--cookies", extras.cookiesFile);
    else if (extras?.cookiesFromBrowser)
      args.push("--cookies-from-browser", extras.cookiesFromBrowser);

    args.push(url);

    const proc = spawn(opts.binaryPath, args, {
      shell: false,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      timeout: DEFAULT_TIMEOUT
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
    }, DEFAULT_TIMEOUT);

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeoutHandle);
      if (timedOut) {
        logger.warn(`yt-dlp playlist page probe timed out after ${DEFAULT_TIMEOUT}ms for:`, url);
        return reject(new Error(`yt-dlp playlist page probe timed out after ${DEFAULT_TIMEOUT}ms`));
      }
      if (code !== 0) {
        logger.error(
          `yt-dlp playlist page probe failed for:`,
          url,
          parseYtDlpError(stderr) || stderr
        );
        return reject(
          new Error(`yt-dlp playlist page probe failed: ${parseYtDlpError(stderr) || stderr}`)
        );
      }
      try {
        const lines = stdout
          .trim()
          .split("\n")
          .filter((l) => l.trim());
        if (lines.length === 0) {
          logger.warn("yt-dlp returned no data for playlist page:", url);
          return reject(new Error("yt-dlp returned no data for playlist page"));
        }
        logger.debug(`Playlist page probe successful for:`, url, `(${lines.length} items)`);
        resolve(lines.map((line) => JSON.parse(line)));
      } catch (err) {
        logger.error("Failed to parse yt-dlp playlist page output for:", url, err);
        reject(
          new Error(
            `Failed to parse yt-dlp playlist page output: ${err instanceof Error ? err.message : String(err)}`
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

// ---- download() helpers -----------------------------------------------
function buildMediaArgs(args: string[], extras: DownloadExtras | undefined): void {
  // Handle audio extraction (separate from video downloads)
  if (extras?.audioFormat) {
    args.push("--extract-audio", "--audio-format", extras.audioFormat);
    // When extracting audio, we don't need the format selector for video —
    // just use bestaudio to get the best quality audio.
    const formatIndex = args.indexOf("--format");
    if (formatIndex !== -1 && args[formatIndex + 1]) {
      args[formatIndex + 1] = "bestaudio";
    }
    logger.debug("Audio extraction mode, format:", extras.audioFormat);
    return;
  }

  // Video downloads: ensure proper container merging
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

function buildSubtitleAndArchiveArgs(
  args: string[],
  opts: YtDlpOptions,
  extras: DownloadExtras | undefined,
  formatSelector?: string
): void {
  if (extras?.subtitles === "external") {
    args.push("--write-subs", "--write-auto-subs");
    if (extras.subtitleLanguages && extras.subtitleLanguages.length > 0) {
      args.push("--sub-langs", extras.subtitleLanguages.join(","));
      logger.debug("External subtitles enabled, languages:", extras.subtitleLanguages);
    } else {
      logger.debug("External subtitles enabled (all languages)");
    }
  }
  if (extras?.useDownloadArchive && !extras?.overwrite) {
    // Create format-specific archive file to track different quality downloads separately
    const formatKey = formatSelector ? formatSelector.replace(/[^a-zA-Z0-9]/g, "_") : "best";
    const archiveFile = join(opts.userDataPath, `archive-${formatKey}.txt`);
    args.push("--download-archive", archiveFile);
    logger.debug("Download archive enabled for format:", formatKey, "file:", archiveFile);
  } else if (extras?.useDownloadArchive && extras?.overwrite) {
    logger.debug("Download archive disabled because overwrite mode is active");
  }
}

function attachDownloadOutputHandlers(
  proc: ChildProcess,
  onProgress?: (progress: YtDlpProgress) => void
): { getStderr: () => string; getStdoutInfo: () => string } {
  let stderr = "";
  let stdoutInfo = "";
  let stdoutBuffer = "";
  let stderrBuffer = "";

  const parseProgressLine = (line: string): YtDlpProgress | null => {
    const outputLine = line.trim();
    if (!outputLine) return null;

    try {
      return JSON.parse(outputLine) as YtDlpProgress;
    } catch {
      const percentMatch = outputLine.match(/\[download\]\s+([\d.]+)%/);
      if (percentMatch) {
        return {
          status: "downloading",
          percentComplete: Number.parseFloat(percentMatch[1])
        };
      }

      if (isAbsolute(outputLine)) {
        return { filename: outputLine };
      }

      return null;
    }
  };

  const processLines = (
    chunk: Buffer,
    previousBuffer: string,
    onLine: (line: string) => void
  ): string => {
    const lines = (previousBuffer + chunk.toString()).split(/\r\n|\r|\n/);
    const nextBuffer = lines.pop() ?? "";
    for (const line of lines) onLine(line);
    return nextBuffer;
  };

  proc.stdout?.on("data", (chunk) => {
    stdoutBuffer = processLines(chunk, stdoutBuffer, (line) => {
      const progress = parseProgressLine(line);
      if (progress) {
        logger.debug("Download progress:", progress);
        onProgress?.(progress);
      } else {
        stdoutInfo += `${line}\n`;
      }
    });
  });

  proc.stderr?.on("data", (chunk) => {
    const data = chunk.toString();
    stderr += data;
    stderrBuffer = processLines(chunk, stderrBuffer, (line) => {
      const progress = parseProgressLine(line);
      if (progress) {
        logger.debug("Download progress:", progress);
        onProgress?.(progress);
      } else if (line.trim()) {
        logger.debug("yt-dlp stderr:", line.trim());
      }
    });
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
  downloadPath?: string,
  onProgress?: (progress: YtDlpProgress) => void,
  resume?: boolean
): { process: ChildProcess; promise: Promise<void> } {
  logger.info("Starting download:", url, resume ? "(resume)" : "");
  logger.debug("Download options:", {
    formatSelector,
    outputTemplate,
    downloadPath,
    resume,
    extras
  });

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
    "--print",
    "after_move:filepath",
    "--js-runtimes",
    `node:${process.execPath}`,
    "--prefer-free-formats",
    "--no-warnings"
  ];

  // Add download path if specified (youtube-downloader approach)
  if (downloadPath) {
    args.push("--paths", downloadPath);
    logger.debug("Download path set to:", downloadPath);
  }

  buildMediaArgs(args, extras);

  if (extras?.overwrite) {
    args.push("--force-overwrites");
    logger.debug("Overwrite mode enabled");
  } else if (resume) {
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
  buildSubtitleAndArchiveArgs(args, opts, extras, formatSelector);

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
      downloadPath?: string,
      onProgress?: (progress: YtDlpProgress) => void,
      resume?: boolean
    ) =>
      download(opts, url, outputTemplate, formatSelector, extras, downloadPath, onProgress, resume),
    binaryPath: opts.binaryPath,
    ffmpegPath: opts.ffmpegPath,
    pluginPath: opts.pluginPath,
    userDataPath: opts.userDataPath
  };
}

export type YtDlpManager = ReturnType<typeof createYtDlpManager>;
