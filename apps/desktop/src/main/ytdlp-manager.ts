import { spawn, type ChildProcess } from "node:child_process";
import { isAbsolute, join } from "node:path";
import type { YtDlpProgress, DownloadExtras, PostProcessStep } from "@vault/types";
import { validateMediaUrl, validateYouTubeUrl } from "./validators";
import { logger } from "./logger";

export interface YtDlpOptions {
  binaryPath: string;
  ffmpegPath: string;
  userDataPath: string;
}

export interface ProbeOptions extends DownloadExtras {
  retries?: number;
  timeout?: number;
  playlistLimit?: number;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRIES = 2;

const LOSSLESS_AUDIO_FORMATS = new Set(["flac", "wav"]);

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

// ---- trim helpers ------------------------------------------------------
const TRIM_HMS_RE = /^(\d+):(\d{1,2}):(\d{1,2})$/;
const TRIM_MS_RE = /^(\d{1,2}):(\d{1,2})$/;
const TRIM_SECONDS_RE = /^\d+(?:\.\d+)?$/;

function hasTrimRange(extras: DownloadExtras | undefined): boolean {
  return Boolean(extras?.trimRange?.start || extras?.trimRange?.end);
}

function toYtDlpTimestamp(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v || v === "inf" || v === "infinity") return "inf";

  let total: number;
  if (TRIM_SECONDS_RE.test(v)) {
    total = Number.parseFloat(v);
  } else if (TRIM_MS_RE.test(v)) {
    const m = v.match(TRIM_MS_RE)!;
    total = Number(m[1]) * 60 + Number(m[2]);
  } else if (TRIM_HMS_RE.test(v)) {
    const m = v.match(TRIM_HMS_RE)!;
    total = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  } else {
    return null;
  }

  const sec = Math.max(0, Math.round(total));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
}

function timestampToSeconds(raw: string): number {
  const v = raw.trim();
  if (!v) return 0;
  const parts = v.split(":").map((p) => Number.parseFloat(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
// -------------------------------------------------------------------------

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
    return "Access forbidden (HTTP 403). YouTube may be blocking the download. Try enabling cookies in Settings.";
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
  logger.debug("Binary path:", opts.binaryPath);
  logger.debug("FFmpeg path:", opts.ffmpegPath);
  return new Promise((resolve, reject) => {
    const args = [
      "--dump-json",
      "--flat-playlist",
      "--quiet",
      "--no-warnings",
      "--js-runtimes",
      `node:${process.execPath}`,
      "--extractor-args",
      "youtube:player_client=web_safari,web_embedded,-tv_downgraded"
    ];

    if (extras?.cookiesFile) args.push("--cookies", extras.cookiesFile);
    else if (extras?.cookiesFromBrowser)
      args.push("--cookies-from-browser", extras.cookiesFromBrowser);

    if (playlistLimit && playlistLimit > 0) {
      args.push("--playlist-items", `1:${playlistLimit}`);
    }

    args.push(url);

    logger.debug("Spawning yt-dlp with args:", args);

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
        logger.error(`yt-dlp probe failed for:`, url, "Exit code:", code);
        logger.error("Full stderr:", stderr);
        logger.error("Full stdout:", stdout);
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
      const result = await probeInternal(opts, url, extras, timeout, extras?.playlistLimit);
      return result;
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
      "--extractor-args",
      "youtube:player_client=web_safari,web_embedded,-tv_downgraded",
      "--quiet",
      "--no-warnings",
      "--playlist-items",
      `${start}:${end}`
    ];

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
  if (extras?.audioFormat) {
    args.push("--extract-audio", "--audio-format", extras.audioFormat);
    const formatIndex = args.indexOf("--format");
    if (formatIndex !== -1 && args[formatIndex + 1]) {
      args[formatIndex + 1] = "bestaudio";
    }
    logger.debug("Audio extraction mode, format:", extras.audioFormat);
    return;
  }

  const container = extras?.videoContainer || "mp4";
  // --merge-output-format already produces the target container during the merge.
  // --remux-video is NOT added here because it spawns a redundant ffmpeg pass
  // that reads the entire file just to confirm "already mp4". On slow storage
  // (USB/pendrive), this wastes 5-10 minutes per download.
  args.push("--merge-output-format", container);
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
  audioFormat: string,
  videoContainer: string,
  isAudioOnly: boolean
): boolean {
  const outputFormat = isAudioOnly ? audioFormat : videoContainer;
  return THUMBNAIL_SUPPORTED_FORMATS.has(outputFormat);
}

function buildThumbnailAndMetadataArgs(
  args: string[],
  extras: DownloadExtras | undefined,
  audioFormat: string,
  videoContainer: string
): void {
  const isAudioOnly = Boolean(extras?.audioFormat);
  const embeddable = canEmbedThumbnail(audioFormat, videoContainer, isAudioOnly);

  if (extras?.audioBitrate && !LOSSLESS_AUDIO_FORMATS.has(audioFormat)) {
    args.push("--audio-quality", `${extras.audioBitrate}K`);
    logger.debug("Audio bitrate set to:", extras.audioBitrate, "kbps");
  }

  if (embeddable && extras?.embedThumbnail) {
    args.push("--embed-thumbnail", "--ppa", "EmbedThumbnail:-c copy");
    logger.debug("Thumbnail embedding enabled");
  } else if (extras?.embedThumbnail && !embeddable) {
    logger.debug("Thumbnail embedding disabled: unsupported output format");
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

  const trimmed = hasTrimRange(extras);

  if (extras?.useDownloadArchive && !extras?.overwrite && !trimmed) {
    const formatKey = formatSelector ? formatSelector.replace(/[^a-zA-Z0-9]/g, "_") : "best";
    const archiveFile = join(opts.userDataPath, `archive-${formatKey}.txt`);
    args.push("--download-archive", archiveFile);
    logger.debug("Download archive enabled for format:", formatKey, "file:", archiveFile);
  } else if (extras?.useDownloadArchive && extras?.overwrite) {
    logger.debug("Download archive disabled because overwrite mode is active");
  } else if (extras?.useDownloadArchive && trimmed) {
    logger.debug("Download archive skipped for trimmed download");
  }
}

function parseBytesUnit(valueStr: string, unitStr: string): number {
  const num = Number.parseFloat(valueStr);
  if (Number.isNaN(num)) return 0;
  const unit = unitStr.toLowerCase();
  if (unit.startsWith("k")) return num * 1024;
  if (unit.startsWith("m")) return num * 1024 * 1024;
  if (unit.startsWith("g")) return num * 1024 * 1024 * 1024;
  return num;
}

function parseEta(etaStr: string): number | undefined {
  const parts = etaStr.split(":").map((p) => Number.parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return undefined;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return undefined;
}

/**
 * Detects post-processing step names from yt-dlp stdout/stderr lines.
 * Returns a progress event with the appropriate status and step, or null.
 */
function parsePostProcessLine(line: string): YtDlpProgress | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[Merger]")) {
    return { status: "processing", postProcessStep: "merging" };
  }
  if (trimmed.startsWith("[Metadata]")) {
    return { status: "postprocessing", postProcessStep: "metadata" };
  }
  if (trimmed.startsWith("[EmbedThumbnail]")) {
    return { status: "postprocessing", postProcessStep: "thumbnail" };
  }
  if (trimmed.startsWith("[SponsorBlock]")) {
    return { status: "postprocessing", postProcessStep: "sponsorblock" };
  }
  if (trimmed.startsWith("[ExtractAudio]")) {
    return { status: "postprocessing", postProcessStep: "extractaudio" };
  }
  if (trimmed.startsWith("[Remux]")) {
    return { status: "processing", postProcessStep: "remux" };
  }
  if (trimmed.startsWith("[ModifyChapters]")) {
    return { status: "postprocessing", postProcessStep: "chapters" };
  }
  if (trimmed.startsWith("[ffmpeg]")) {
    return { status: "processing", postProcessStep: "generic" };
  }

  return null;
}

function attachDownloadOutputHandlers(
  proc: ChildProcess,
  isTrimmed: boolean,
  trimClipSeconds: number | undefined,
  onProgress?: (progress: YtDlpProgress) => void
): { getStderr: () => string; getStdoutInfo: () => string; cleanup: () => void } {
  let stderr = "";
  let stdoutInfo = "";
  let stdoutBuffer = "";
  let stderrBuffer = "";
  let lastFfmpegPercent = -1;
  let ffmpegProcessingEmitted = false;
  let lastPostProcessKey = "";

  // Heartbeat for long-running post-processing steps (merging, finalizing)
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let currentPostProcessStep: PostProcessStep | null = null;

  const startHeartbeat = (step: PostProcessStep) => {
    if (currentPostProcessStep === step && heartbeatInterval) return;
    currentPostProcessStep = step;
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    // Emit immediately
    onProgress?.({ status: "processing", postProcessStep: step });

    // Emit every 2 seconds so the UI knows it's not frozen
    heartbeatInterval = setInterval(() => {
      onProgress?.({ status: "processing", postProcessStep: step });
    }, 2000);
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    currentPostProcessStep = null;
  };

  const parseProgressLine = (line: string): YtDlpProgress | null => {
    const outputLine = line.trim();
    if (!outputLine) return null;

    // ── Check post-processing step lines FIRST ──
    const ppEvent = parsePostProcessLine(outputLine);
    if (ppEvent) {
      if (ppEvent.postProcessStep) {
        startHeartbeat(ppEvent.postProcessStep);
      }
      return ppEvent;
    }

    // ── Try to parse JSON progress (from --progress-template) ──
    const jsonCandidate = outputLine.replace(/^[a-zA-Z0-9_-]+:/, "").trim();
    try {
      const parsed = JSON.parse(jsonCandidate) as YtDlpProgress;
      if (parsed && typeof parsed === "object") {
        if (parsed.status === "downloading" || parsed.status === "finished") {
          stopHeartbeat();
        }
        if (parsed.percentComplete === undefined) {
          const total = parsed.total_bytes ?? parsed.total_bytes_estimate;
          if (total && typeof parsed.downloaded_bytes === "number") {
            parsed.percentComplete = Math.min(100, (parsed.downloaded_bytes / total) * 100);
          }
        }
        return parsed;
      }
    } catch {
      // JSON parsing failed, try text format
    }

    // ── Parse standard yt-dlp text progress format ──
    const textMatch = outputLine.match(
      /\[download\]\s+([\d.]+)%\s+of\s+(~?)([\d.]+)\s*([a-zA-Z]+)(?:\s+at\s+~?([\d.]+)\s*([a-zA-Z]+)\/s)?(?:\s+ETA\s+([\d:]+))?/
    );
    if (textMatch) {
      stopHeartbeat();
      const percentComplete = Number.parseFloat(textMatch[1]);
      const isEstimate = textMatch[2] === "~";
      const totalSizeNum = textMatch[3];
      const totalSizeUnit = textMatch[4];
      const speedNum = textMatch[5];
      const speedUnit = textMatch[6];
      const etaStr = textMatch[7];

      const totalBytes = parseBytesUnit(totalSizeNum, totalSizeUnit);
      const downloadedBytes = totalBytes > 0 ? (totalBytes * percentComplete) / 100 : undefined;
      const speedBytes = speedNum && speedUnit ? parseBytesUnit(speedNum, speedUnit) : undefined;
      const etaSeconds = etaStr ? parseEta(etaStr) : undefined;

      const result: YtDlpProgress = {
        status: "downloading",
        percentComplete
      };
      if (downloadedBytes !== undefined) result.downloaded_bytes = downloadedBytes;
      if (totalBytes > 0) {
        if (isEstimate) result.total_bytes_estimate = totalBytes;
        else result.total_bytes = totalBytes;
      }
      if (speedBytes !== undefined) result.speed = speedBytes;
      if (etaSeconds !== undefined) result.eta = etaSeconds;
      return result;
    }

    const percentMatch = outputLine.match(/\[download\]\s+([\d.]+)%/);
    if (percentMatch) {
      stopHeartbeat();
      const percentComplete = Number.parseFloat(percentMatch[1]);
      return {
        status: "downloading",
        percentComplete
      };
    }

    // ── Parse filename lines ──
    if (isAbsolute(outputLine) || outputLine.startsWith("[download] Destination:")) {
      const filename = outputLine.replace("[download] Destination:", "").trim();
      return { filename };
    }

    return null;
  };

  const tryEmitFfmpegProgress = (line: string): boolean => {
    if (!line.includes("frame=") || !line.includes("time=")) return false;
    const m = line.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!m) return false;
    const elapsed = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number.parseFloat(m[3]);
    if (Number.isNaN(elapsed)) return false;

    if (isTrimmed) {
      if (trimClipSeconds && trimClipSeconds > 0) {
        const percentComplete = Math.min(100, (elapsed / trimClipSeconds) * 100);
        if (percentComplete >= 100 || percentComplete - lastFfmpegPercent >= 1) {
          lastFfmpegPercent = percentComplete;
          const progress: YtDlpProgress = {
            status: "cutting",
            percentComplete,
            postProcessStep: "cutting"
          };
          logger.debug("Trim encode progress:", progress);
          onProgress?.(progress);
        }
      } else if (!ffmpegProcessingEmitted) {
        ffmpegProcessingEmitted = true;
        logger.debug("Trim encode started (indeterminate)");
        startHeartbeat("cutting");
      }
    } else if (!ffmpegProcessingEmitted) {
      ffmpegProcessingEmitted = true;
      logger.debug("FFmpeg post-processing started");
      startHeartbeat("generic");
    }
    return true;
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
        // Throttle: only emit post-processing events when the step changes
        if (progress.status === "processing" || progress.status === "postprocessing") {
          const key = `${progress.status}:${progress.postProcessStep ?? "unknown"}`;
          if (lastPostProcessKey === key) return;
          lastPostProcessKey = key;
        }
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
        if (progress.status === "processing" || progress.status === "postprocessing") {
          const key = `${progress.status}:${progress.postProcessStep ?? "unknown"}`;
          if (lastPostProcessKey === key) return;
          lastPostProcessKey = key;
        }
        logger.debug("Download progress:", progress);
        onProgress?.(progress);
        return;
      }
      if (tryEmitFfmpegProgress(line)) return;
      if (line.trim()) {
        logger.debug("yt-dlp stderr:", line.trim());
      }
    });
  });

  return { getStderr: () => stderr, getStdoutInfo: () => stdoutInfo, cleanup: stopHeartbeat };
}

function createDownloadCompletionPromise(
  proc: ChildProcess,
  url: string,
  getStderr: () => string,
  getStdoutInfo: () => string,
  cleanup: () => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    proc.on("close", (code) => {
      cleanup(); // Stop post-processing heartbeat
      if (code === 0) {
        logger.info("Download completed successfully:", url);
        resolve();
        return;
      }
      const stderr = getStderr();
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
    proc.on("error", (err) => {
      cleanup();
      reject(err);
    });
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
    "--no-warnings",
    "--js-runtimes",
    `node:${process.execPath}`,
    "--extractor-args",
    "youtube:player_client=web_safari,web_embedded,-tv_downgraded",
    "--progress-template",
    "download:%(progress)j"
  ];

  if (downloadPath) {
    args.push("--paths", downloadPath);
    logger.debug("Download path set to:", downloadPath);
  }

  buildMediaArgs(args, extras);

  const trimmed = hasTrimRange(extras);

  if (resume && !trimmed) {
    args.push("--continue");
    logger.debug("Resume mode enabled");
  } else if (extras?.overwrite) {
    args.push("--force-overwrites");
    logger.debug("Overwrite mode enabled");
  } else if (resume && trimmed) {
    logger.debug("Trimmed download cannot resume — restarting section instead");
  }

  buildAuthAndNetworkArgs(args, extras);

  let trimClipSeconds: number | undefined;
  if (trimmed && extras?.trimRange) {
    const start = toYtDlpTimestamp(extras.trimRange.start || "0");
    const end = extras.trimRange.end ? toYtDlpTimestamp(extras.trimRange.end) : "inf";

    if (start && end && start !== "inf") {
      args.push("--download-sections", `*${start}-${end}`);
      logger.debug(`Time-range cropping enabled: *${start}-${end}`);

      if (end !== "inf") {
        const startSec = timestampToSeconds(start);
        const endSec = timestampToSeconds(end);
        if (endSec > startSec) trimClipSeconds = endSec - startSec;
      }

      if (extras.frameAccurate) {
        args.push("--force-keyframes");
        logger.debug("Frame-accurate cutting enabled (re-encode)");
      }
    } else {
      logger.warn("Skipping invalid trim range:", extras.trimRange);
    }
  }

  const isAudio = formatSelector.includes("bestaudio") || formatSelector.includes("audio");
  const isAudioOnly = Boolean(extras?.audioFormat);
  const audioFormat = resolveAudioFormat(formatSelector, isAudio, extras?.audioFormat);
  const videoContainer = extras?.videoContainer || "mp4";

  logger.debug("Media type detection:", {
    isAudio,
    isAudioOnly,
    audioFormat,
    videoContainer,
    canEmbedThumbnail: canEmbedThumbnail(audioFormat, videoContainer, isAudioOnly)
  });

  buildThumbnailAndMetadataArgs(args, extras, audioFormat, videoContainer);
  buildSubtitleAndArchiveArgs(args, opts, extras, formatSelector);

  args.push(url);
  logger.debug("Final yt-dlp command:", args.join(" "));

  const proc = spawn(opts.binaryPath, args, {
    shell: false,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const { getStderr, getStdoutInfo, cleanup } = attachDownloadOutputHandlers(
    proc,
    trimmed,
    trimClipSeconds,
    onProgress
  );
  const promise = createDownloadCompletionPromise(proc, url, getStderr, getStdoutInfo, cleanup);

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
    userDataPath: opts.userDataPath
  };
}

export type YtDlpManager = ReturnType<typeof createYtDlpManager>;
