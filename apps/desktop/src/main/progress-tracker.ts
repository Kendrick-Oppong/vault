import type { YtDlpProgress } from "@vault/types";

export interface EnrichedProgress extends YtDlpProgress {
  percentComplete?: number;
  speedMbps?: number;
  etaSeconds?: number;
  elapsedSeconds?: number;
  remainingBytes?: number;
  formattedSpeed?: string;
  formattedEta?: string;
  streamPhase?: "video" | "audio" | "unknown";
}

export interface ProgressTracker {
  track: (progress: YtDlpProgress) => EnrichedProgress;
  isStalled: (stallThresholdMs?: number) => boolean;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec == null || Number.isNaN(bytesPerSec)) return "calculating...";
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(1)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  if (bytesPerSec < 1024 * 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
}

function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || Number.isNaN(seconds)) return "calculating...";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes == null || Number.isNaN(bytes)) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function parsePercentage(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = value.match(/[\d.]+/);
    if (match) {
      const num = Number.parseFloat(match[0]);
      return Number.isNaN(num) ? undefined : num;
    }
  }
  return undefined;
}

export function createProgressTracker(): ProgressTracker {
  const startTime = Date.now();
  let totalBytes = 0;
  let lastProgressTime = startTime;
  let accumulatedBytes = 0;
  let currentStreamDownloaded = 0;
  let streamCount = 0; // Track which stream we're on (0 = first, 1 = second, etc.)
  let accumulatedTotalBytes = 0; // Track cumulative total across all streams

  function track(progress: YtDlpProgress): EnrichedProgress {
    const now = Date.now();
    lastProgressTime = now;
    const elapsedSeconds = (now - startTime) / 1000;

    const downloaded = progress.downloaded_bytes ?? 0;

    // Detect if a new stream started (e.g., switched from video to audio)
    // If downloaded bytes drops significantly, it's a new file
    if (downloaded < currentStreamDownloaded - 1024 * 1024) {
      accumulatedBytes += currentStreamDownloaded;
      // Also accumulate the total bytes from the previous stream
      accumulatedTotalBytes += totalBytes;
      streamCount++;
    }
    currentStreamDownloaded = downloaded;

    // Update current stream's total bytes
    if (progress.total_bytes_estimate) {
      totalBytes = Math.max(totalBytes, progress.total_bytes_estimate);
    }
    if (progress.total_bytes) {
      totalBytes = Math.max(totalBytes, progress.total_bytes);
    }

    const totalDownloaded = accumulatedBytes + currentStreamDownloaded;
    // The true total is the sum of all completed streams plus the current stream
    const trueTotal = accumulatedTotalBytes + totalBytes;

    const hasExplicitPercent =
      typeof progress.percentComplete === "number" && !Number.isNaN(progress.percentComplete);
    // Phase-based progress (cutting / post-processing) carries its own percent
    // that is not derived from downloaded bytes — trust it as-is.
    const isPhaseProgress =
      progress.status === "cutting" ||
      progress.status === "processing" ||
      progress.status === "postprocessing";

    const percentComplete =
      isPhaseProgress && hasExplicitPercent
        ? progress.percentComplete
        : trueTotal > 0
          ? Math.min(100, (totalDownloaded / trueTotal) * 100)
          : hasExplicitPercent
            ? progress.percentComplete
            : undefined;

    const remainingBytes = trueTotal > 0 ? Math.max(0, trueTotal - totalDownloaded) : undefined;

    const speedMbps = progress.speed ? (progress.speed * 8) / 1_000_000 : undefined;

    let etaSeconds: number | undefined;
    if (progress.eta !== undefined) {
      etaSeconds = progress.eta;
    } else if (speedMbps && speedMbps > 0 && remainingBytes && remainingBytes > 0) {
      etaSeconds = Math.max(0, Math.round(remainingBytes / ((speedMbps * 1_000_000) / 8)));
    }

    const formattedSpeed = progress.speed == null ? undefined : formatSpeed(progress.speed);

    const formattedEta = etaSeconds === undefined ? undefined : formatEta(etaSeconds);

    // Always use the accumulated total which includes all streams
    const displayTotalBytes = trueTotal > 0 ? trueTotal : progress.total_bytes;

    // Detect which stream we're downloading based on stream count and filename
    let streamPhase: "video" | "audio" | "unknown" = "unknown";
    if (progress.status === "downloading" && progress.filename) {
      const filename = progress.filename.toLowerCase();

      // First check filename for explicit audio/video indicators
      const isAudioFile =
        filename.includes(".m4a") ||
        filename.includes(".mp3") ||
        filename.includes(".opus") ||
        filename.includes(".flac") ||
        filename.includes(".wav") ||
        filename.includes(".aac") ||
        filename.includes(".faudio");

      // For audio-only downloads (single stream with audio extension)
      if (isAudioFile && streamCount === 0) {
        streamPhase = "audio";
      }
      // For video downloads with separate streams
      else if (streamCount === 0) {
        streamPhase = "video"; // First stream is video
      } else if (streamCount > 0) {
        streamPhase = "audio"; // Second stream is audio
      }

      // Additional verification using format codes (not exhaustive, just common ones)
      // This helps in edge cases where stream detection might be ambiguous
      if (filename.match(/\.f(140|251|250|139|171|249)\b/)) {
        streamPhase = "audio";
      } else if (filename.match(/\.f(137|248|303|398|244|247|136|135|18|22)\b/)) {
        streamPhase = "video";
      }
    }

    return {
      ...progress,
      downloaded_bytes: totalDownloaded,
      total_bytes: displayTotalBytes,
      percentComplete,
      speedMbps,
      etaSeconds,
      elapsedSeconds,
      remainingBytes,
      formattedSpeed,
      formattedEta,
      streamPhase
    };
  }

  function isStalled(stallThresholdMs = 10000): boolean {
    return Date.now() - lastProgressTime > stallThresholdMs;
  }

  return { track, isStalled };
}
