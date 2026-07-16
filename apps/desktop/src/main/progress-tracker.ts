/**
 * Progress tracking utility for downloads
 * Calculates ETA, speed, and other metrics from yt-dlp progress updates
 */

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

export class ProgressTracker {
  private startTime: number = 0;
  private lastProgress: YtDlpProgress | null = null;
  private lastProgressTime: number = 0;
  private totalBytes: number = 0;
  private startedBytes: number = 0;

  constructor(totalBytes?: number) {
    this.totalBytes = totalBytes ?? 0;
    this.startTime = Date.now();
    this.lastProgressTime = this.startTime;
  }

  /**
   * Track a progress update and enrich it with calculated metrics
   */
  track(progress: YtDlpProgress): EnrichedProgress {
    const now = Date.now();
    const timeElapsed = (now - this.startTime) / 1000; // seconds

    // Determine total bytes (prefer estimate, fallback to actual)
    if (progress.total_bytes_estimate) {
      this.totalBytes = progress.total_bytes_estimate;
    } else if (progress.total_bytes) {
      this.totalBytes = progress.total_bytes;
    }

    const downloaded = progress.downloaded_bytes ?? 0;
    const total = this.totalBytes;

    // Calculate percentage
    let percentComplete: number | undefined;
    if (total > 0) {
      percentComplete = Math.min(100, (downloaded / total) * 100);
    }

    // Calculate remaining bytes
    let remainingBytes: number | undefined;
    if (total > 0) {
      remainingBytes = Math.max(0, total - downloaded);
    }

    // Calculate speed (bytes per second -> megabits per second)
    let speedMbps: number | undefined;
    if (progress.speed) {
      // yt-dlp provides speed in bytes/sec
      const bytesPerSec = progress.speed;
      speedMbps = (bytesPerSec * 8) / 1_000_000; // Convert to Mbps
    }

    // Calculate ETA (seconds remaining)
    let etaSeconds: number | undefined;
    if (speedMbps && speedMbps > 0 && remainingBytes && remainingBytes > 0) {
      const remainingSeconds = remainingBytes / (speedMbps * 1_000_000 / 8);
      etaSeconds = Math.max(0, Math.round(remainingSeconds));
    }

    // Use yt-dlp's ETA if available (it's more accurate)
    if (progress.eta !== undefined) {
      etaSeconds = progress.eta;
    }

    // Format speed for display
    let formattedSpeed: string | undefined;
    if (speedMbps !== undefined) {
      formattedSpeed = this.formatSpeed(speedMbps);
    } else if (progress.speed !== undefined) {
      formattedSpeed = this.formatSpeed(progress.speed / 1_000_000);
    }

    // Format ETA for display
    let formattedEta: string | undefined;
    if (etaSeconds !== undefined) {
      formattedEta = this.formatDuration(etaSeconds);
    }

    this.lastProgress = progress;
    this.lastProgressTime = now;

    return {
      ...progress,
      percentComplete,
      speedMbps,
      etaSeconds,
      elapsedSeconds: timeElapsed,
      remainingBytes,
      formattedSpeed,
      formattedEta
    };
  }

  /**
   * Format bytes per second into human-readable speed
   */
  private formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec < 1024) {
      return `${bytesPerSec.toFixed(1)} B/s`;
    }
    if (bytesPerSec < 1024 * 1024) {
      return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    }
    if (bytesPerSec < 1024 * 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
  }

  /**
   * Format bytes into human-readable size
   */
  static formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * Format seconds into human-readable duration (HH:MM:SS)
   */
  private formatDuration(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds)) {
      return 'calculating...';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  /**
   * Get current progress state
   */
  getCurrentProgress(): EnrichedProgress | null {
    if (!this.lastProgress) return null;
    return this.track(this.lastProgress);
  }

  /**
   * Check if download appears stalled (no progress in N seconds)
   */
  isStalled(stallThresholdMs: number = 10000): boolean {
    if (!this.lastProgress) return false;
    const timeSinceLastUpdate = Date.now() - this.lastProgressTime;
    return timeSinceLastUpdate > stallThresholdMs;
  }

  /**
   * Reset tracker for new download
   */
  reset(totalBytes?: number): void {
    this.startTime = Date.now();
    this.lastProgress = null;
    this.lastProgressTime = this.startTime;
    this.totalBytes = totalBytes ?? 0;
    this.startedBytes = 0;
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedSeconds(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Get average speed so far
   */
  getAverageSpeed(): number {
    if (!this.lastProgress) return 0;
    const downloaded = this.lastProgress.downloaded_bytes ?? 0;
    const elapsed = this.getElapsedSeconds();
    if (elapsed < 1) return 0;
    return downloaded / elapsed; // bytes per second
  }
}

/**
 * Parse yt-dlp's percentage field (may be string like "23.4%")
 */
export function parsePercentage(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/[\d.]+/);
    if (match) {
      const num = parseFloat(match[0]);
      return isNaN(num) ? undefined : num;
    }
  }
  return undefined;
}

/**
 * Calculate remaining time from progress data
 */
export function calculateEta(
  downloaded: number,
  total: number,
  speed: number
): number | null {
  if (total <= 0 || speed <= 0 || downloaded >= total) return null;
  const remaining = total - downloaded;
  return remaining / speed; // seconds
}
