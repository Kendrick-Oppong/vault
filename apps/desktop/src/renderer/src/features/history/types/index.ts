export type HistorySort = "title" | "date" | "size";
export type SortOrder = "asc" | "desc";
export type MediaType = "video" | "music";
export type Quality = "1080p" | "4K" | "720p" | "FLAC" | "MP3" | (string & {});

export interface HistoryItem {
  id: string;
  title: string;
  channel: string;
  type: MediaType;
  quality: Quality;
  size: string;
  sizeBytes: number;
  addedAt: Date;
  duration?: string;
  thumbnail?: string;
  url?: string;
  filePath?: string;
  status: string;
  isRecovered?: boolean;
}

export interface HistoryStats {
  total: number;
  totalSize: string;
  totalSizeBytes: number;
}
