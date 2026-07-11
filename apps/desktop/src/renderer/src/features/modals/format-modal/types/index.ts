export type MediaType = "video" | "audio";
export type LinkType = "video" | "playlist" | "channel";

export interface VideoFormat {
  label: string;
  resolution: string;
  fps: number[];
  codec: string;
  size: string;
  sizeBytes: number;
  bitrate?: string;
}

export interface AudioFormat {
  label: string;
  codec: string;
  bitrate: string;
  size: string;
  sizeBytes: number;
  lossless?: boolean;
}

export interface FormatModalData {
  title: string;
  channel: string;
  thumbnail?: string;
  type: LinkType;
  duration?: string;
  videoCount?: number;
  playlistItems?: string[];
  selectedCount?: number;
  totalCount?: number;
  duplicate?: boolean;
  videoFormats: VideoFormat[];
  audioFormats: AudioFormat[];
}
