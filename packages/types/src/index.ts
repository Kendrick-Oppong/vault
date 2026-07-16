// Shared types between main and renderer

export interface JobMeta {
  videoId?: string;
  title?: string;
  channel?: string;
  thumbnailUrl?: string;
  expectedPath?: string;
  mediaType?: "video" | "music";
  quality?: string;
}

export interface JobInput {
  url: string;
  outputTemplate: string;
  formatSelector: string;
  extra?: DownloadExtras;
  meta?: JobMeta;
}

export interface Job extends JobInput {
  id: string;
  status: JobStatus;
  createdAt: number;
  error?: string;
}

export type JobStatus = "pending" | "active" | "paused" | "completed" | "failed" | "cancelled";

export interface DownloadExtras {
  cookiesFromBrowser?: "chrome" | "firefox" | "safari" | "edge";
  cookiesFile?: string;
  rateLimit?: string;
  proxy?: string;
  geoBypass?: boolean;
  embedThumbnail?: boolean;
  embedMetadata?: boolean;
  subtitles?: "none" | "external" | "burned";
  subtitleLanguages?: string[];
  downloadArchive?: string;
  archiveKey?: string;
  reencodeFormat?: "none" | "h264-aac" | "h265-aac";
}

export interface YtDlpProgress {
  status?: string;
  downloaded_bytes?: number;
  total_bytes?: number;
  total_bytes_estimate?: number;
  speed?: number;
  eta?: number;
  filename?: string;
  [key: string]: unknown;
}

export interface HistoryEntry {
  job_id: string;
  video_id: string | null;
  title: string | null;
  channel: string | null;
  url: string;
  file_path: string | null;
  thumbnail_url: string | null;
  status: string;
  media_type: string | null;
  quality: string | null;
  file_size: number | null;
  created_at: number;
  completed_at: number;
}
