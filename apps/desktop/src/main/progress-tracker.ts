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

export function createProgressTracker(isAudioOnly = false): ProgressTracker {
  const startTime = Date.now();
  let lastProgressTime = startTime;

  // Multi-stream tracking: video downloads have 2 streams (video + audio),
  // audio-only downloads have 1 stream.
  let streamIndex = 0;
  let previousStreamBytes = 0; // total bytes from all COMPLETED streams
  let currentStreamDownloaded = 0;
  let currentStreamTotal = 0;

  function track(progress: YtDlpProgress): EnrichedProgress {
    const now = Date.now();
    lastProgressTime = now;
    const elapsedSeconds = (now - startTime) / 1000;

    const downloaded = progress.downloaded_bytes ?? 0;

    // ── Detect stream transitions FIRST (before updating totals) ──
    // If downloaded_bytes drops significantly, a new stream has started.
    // This happens when yt-dlp finishes the video stream and starts audio.
    if (downloaded < currentStreamDownloaded - 1024 * 512 && currentStreamDownloaded > 0) {
      previousStreamBytes += currentStreamTotal;
      streamIndex++;
      currentStreamTotal = 0;
    }
    currentStreamDownloaded = downloaded;

    // Track current stream's total size (use max since estimates can fluctuate)
    const reportedTotal = progress.total_bytes ?? progress.total_bytes_estimate ?? 0;
    if (reportedTotal > currentStreamTotal) {
      currentStreamTotal = reportedTotal;
    }

    // ── Compute true totals across ALL streams ──
    const totalDownloaded = previousStreamBytes + currentStreamDownloaded;
    const trueTotal = previousStreamBytes + currentStreamTotal;

    // ── Determine stream phase ──
    let streamPhase: "video" | "audio" | "unknown" = "unknown";
    if (progress.status === "downloading") {
      if (isAudioOnly) {
        streamPhase = "audio";
      } else if (streamIndex === 0) {
        streamPhase = "video";
      } else {
        streamPhase = "audio";
      }
    }

    // ── Compute percent ──
    const hasExplicitPercent =
      typeof progress.percentComplete === "number" && !Number.isNaN(progress.percentComplete);
    const isPhaseProgress =
      progress.status === "cutting" ||
      progress.status === "processing" ||
      progress.status === "postprocessing";

    let percentComplete: number | undefined;
    if (isPhaseProgress && hasExplicitPercent) {
      percentComplete = progress.percentComplete;
    } else if (trueTotal > 0) {
      percentComplete = Math.min(100, (totalDownloaded / trueTotal) * 100);
    } else if (hasExplicitPercent) {
      percentComplete = progress.percentComplete;
    }

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

    return {
      ...progress,
      downloaded_bytes: totalDownloaded,
      total_bytes: trueTotal > 0 ? trueTotal : progress.total_bytes,
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
