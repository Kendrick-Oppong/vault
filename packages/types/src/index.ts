// Shared types between main and renderer

export * from "./presets";

export interface JobMeta {
  videoId?: string;
  title?: string;
  channel?: string;
  thumbnailUrl?: string;
  expectedPath?: string;
  mediaType?: "video" | "music";
  quality?: string;
  duration?: string;
}

export interface JobInput {
  url: string;
  outputTemplate: string;
  formatSelector: string;
  extra?: DownloadExtras;
  meta?: JobMeta;
  downloadPath?: string;
}

export interface Job extends JobInput {
  id: string;
  status: JobStatus;
  createdAt: number;
  error?: string;
  resume?: boolean;
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
  embedChapters?: boolean;
  sponsorBlock?: boolean;
  subtitles?: "none" | "external" | "burned";
  subtitleLanguages?: string[];
  reencodeFormat?: "none" | "h264-aac" | "h265-aac";
  videoContainer?: "mp4" | "mkv";
  audioFormat?: string; // e.g., "mp3", "m4a", "opus", "flac", "wav"
  audioBitrate?: number; // e.g., 320, 256, 192, 128, 96 (kbps)
  useDownloadArchive?: boolean;
  overwrite?: boolean;
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
