export type MediaType = "video" | "audio";
export type LinkType = "video" | "playlist";

export interface VideoFormat {
  label: string;
  resolution: string;
  fps: number[];
  codec: string;
  size: string;
  sizeBytes: number;
  bitrate?: string;
  formatId?: string;
}

export interface AudioFormat {
  label: string;
  codec: string;
  bitrate: string;
  size: string;
  sizeBytes: number;
  lossless?: boolean;
  formatId?: string;
}

export interface PlaylistItem {
  id: string;
  title: string;
  url?: string;
  thumbnail?: string;
  duration?: string;
}

export interface FormatModalData {
  title: string;
  channel: string;
  thumbnail?: string;
  type: LinkType;
  duration?: string;
  videoCount?: number;
  playlistItems?: PlaylistItem[];
  selectedCount?: number;
  totalCount?: number;
  duplicate?: boolean;
  videoFormats: VideoFormat[];
  audioFormats: AudioFormat[];
}
