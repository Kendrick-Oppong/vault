/**
 * Smart download presets - shared across processes so the renderer can present
 * them and the main process can convert them to yt-dlp format selectors.
 */

export type MediaType = "video" | "audio";
export type VideoContainer = "mp4" | "mkv";
export type AudioFormat = "mp3" | "m4a" | "opus" | "flac" | "wav";

export interface Preset {
  id: string;
  label: string;
  mediaType: MediaType;
  /** Container to use for video presets. */
  container?: VideoContainer;
  /** Audio codec to extract for audio presets. */
  audioFormat?: AudioFormat;
  /** Cap the chosen video height; null means best available. */
  maxHeight?: number | null;
}

export const PRESETS: Preset[] = [
  // Video presets - simpler, container-independent
  {
    id: "best",
    label: "Best",
    mediaType: "video",
    maxHeight: null
  },
  {
    id: "1080p",
    label: "1080p",
    mediaType: "video",
    maxHeight: 1080
  },
  {
    id: "720p",
    label: "720p",
    mediaType: "video",
    maxHeight: 720
  },
  // Audio presets
  {
    id: "audio-mp3",
    label: "Audio MP3",
    mediaType: "audio",
    audioFormat: "mp3"
  },
  {
    id: "audio-flac",
    label: "Audio FLAC",
    mediaType: "audio",
    audioFormat: "flac"
  }
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/**
 * Convert a preset to a yt-dlp format selector string.
 * This ensures consistent output containers that support post-processing.
 */
export function presetToFormatSelector(preset: Preset, formatId?: string): string {
  if (preset.mediaType === "audio") {
    // Audio presets: use simple bestaudio format (audio extraction is handled by --extract-audio flag)
    return "bestaudio";
  }

  // Video presets: combine video and audio with container constraint
  const height = preset.maxHeight;

  // If a specific format ID is provided, use it with best audio
  if (formatId) {
    return `${formatId}+bestaudio/${formatId}/best`;
  }

  if (height === null) {
    // Best quality
    return "bestvideo+bestaudio/best";
  }

  // Capped height
  return `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;
}
