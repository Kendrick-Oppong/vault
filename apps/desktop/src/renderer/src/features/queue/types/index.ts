import type { YtDlpProgress } from "@vault/types";

export type QueueFilter = "all" | "downloading" | "paused" | "queued" | "completed" | "error";

export interface TrimRange {
  start?: string;
  end?: string;
}

export interface QueueItem {
  id: string;
  title: string;
  channel: string;
  status: QueueFilter;
  progress?: number;
  rawProgress?: YtDlpProgress;
  size?: string;
  downloaded?: string;
  addedAt: Date;
  url?: string;
  thumbnail?: string;
  type: "video" | "music";
  format?: string;
  filePath?: string;
  errorMessage?: string;
  errorDetails?: string;
  duration?: string;
  /** Present when the job is a trimmed section (from job.extra.trimRange). */
  trimRange?: TrimRange;
}

export interface QueueStats {
  total: number;
  downloading: number;
  paused: number;
  queued: number;
  completed: number;
  error: number;
}

export interface BulkAction {
  type: "pause" | "resume" | "retry" | "cancel";
  ids: string[];
}
