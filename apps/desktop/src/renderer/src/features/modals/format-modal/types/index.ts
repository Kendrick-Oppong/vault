import type { Preset, MediaType, VideoContainer, AudioFormat } from "@vault/types";

export type { MediaType, Preset, VideoContainer, AudioFormat };
export type LinkType = "video" | "playlist";

export interface VideoFormat {
  formatId: string;
  resolution: string;
  fps: number | null;
  ext: string;
  filesize: number | null;
  tbr: number | null;
}

export interface PlaylistItem {
  id: string;
  title: string;
  url?: string;
  thumbnail?: string;
  duration?: string;
}

export interface FormatModalData {
  id: string; // Unique identifier for the video/playlist (used for playlist tracking)
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
  videoPresets: Preset[];
  audioPresets: Preset[];
  // Raw video formats for manual selection
  videoFormats?: VideoFormat[];
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
  preset: Preset;
  formatId?: string; // Optional manual format override
  videoContainer: VideoContainer;
  audioFormat: AudioFormat;
  audioBitrate?: number; // For non-lossless audio formats
  embedThumbnail: boolean;
  embedMetadata: boolean;
  embedChapters: boolean;
  sponsorBlock: boolean;
  subtitles: "none" | "external";
  subtitleLanguages?: string[];
  reencodeFormat?: "none" | "h264-aac" | "h265-aac";
  destination: string;
  selectedItems?: string[];
}
