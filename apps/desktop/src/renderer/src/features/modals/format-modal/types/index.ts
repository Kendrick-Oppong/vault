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

export interface FormatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: FormatModalData;
  isLoading?: boolean;
  isError?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onConfirm: (options: FormatOptions) => void;
}

export interface FormatOptions {
  mediaType: MediaType;
  videoFormat?: VideoFormat;
  audioFormat?: AudioFormat;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  embedChapters: boolean;
  sponsorBlock: boolean;
  subtitles: "none" | "external";
  subtitleLanguages?: string[];
  reencodeFormat?: "none" | "h264-aac" | "h265-aac";
  videoContainer?: "mp4" | "mkv";
  destination: string;
  selectedItems?: string[];
  audioCodec?: string; // e.g., "mp3", "m4a", "opus", "flac", "wav"
}
