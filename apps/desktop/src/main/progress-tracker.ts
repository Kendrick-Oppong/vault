import type { YtDlpProgress } from "@vault/types";

export interface EnrichedProgress extends YtDlpProgress {
  percentComplete?: number;
  speedMbps?: number;
  etaSeconds?: number;
  elapsedSeconds?: number;
  remainingBytes?: number;
  formattedSpeed?: string;
  formattedEta?: string;
}

export interface ProgressTracker {
  track: (progress: YtDlpProgress) => EnrichedProgress;
  isStalled: (stallThresholdMs?: number) => boolean;
}

function formatSpeed(bytesPerSec: number): string {
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
      const num = parseFloat(match[0]);
      return isNaN(num) ? undefined : num;
    }
  }
  return undefined;
}

export function createProgressTracker(): ProgressTracker {
  const startTime = Date.now();
  let totalBytes = 0;
  let lastProgressTime = startTime;

  function track(progress: YtDlpProgress): EnrichedProgress {
    const now = Date.now();
    lastProgressTime = now;
    const elapsedSeconds = (now - startTime) / 1000;

    if (progress.total_bytes_estimate) totalBytes = progress.total_bytes_estimate;
    else if (progress.total_bytes) totalBytes = progress.total_bytes;

    const downloaded = progress.downloaded_bytes ?? 0;

    const percentComplete =
      totalBytes > 0 ? Math.min(100, (downloaded / totalBytes) * 100) : undefined;

    const remainingBytes = totalBytes > 0 ? Math.max(0, totalBytes - downloaded) : undefined;

    const speedMbps = progress.speed ? (progress.speed * 8) / 1_000_000 : undefined;

    let etaSeconds: number | undefined;
    if (progress.eta !== undefined) {
      etaSeconds = progress.eta;
    } else if (speedMbps && speedMbps > 0 && remainingBytes && remainingBytes > 0) {
      etaSeconds = Math.max(0, Math.round(remainingBytes / ((speedMbps * 1_000_000) / 8)));
    }

    const formattedSpeed = progress.speed === undefined ? undefined : formatSpeed(progress.speed);

    const formattedEta = etaSeconds === undefined ? undefined : formatEta(etaSeconds);

    return {
      ...progress,
      percentComplete,
      speedMbps,
      etaSeconds,
      elapsedSeconds,
      remainingBytes,
      formattedSpeed,
      formattedEta
    };
  }

  function isStalled(stallThresholdMs = 10000): boolean {
    return Date.now() - lastProgressTime > stallThresholdMs;
  }

  return { track, isStalled };
}
