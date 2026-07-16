export type PresetType = "best-mp4" | "1080p-mp4" | "720p-mp4" | "best-mkv" | "audio-mp3" | "audio-flac";
export type ContainerType = "mp4" | "mkv";
export type AudioCodec = "mp3" | "m4a" | "opus" | "flac" | "wav";
export type AudioBitrate = "320k" | "256k" | "192k" | "128k" | "96k";

export interface FormatPreset {
  id: PresetType;
  name: string;
  description: string;
  formatSelector: string;
  container?: ContainerType;
  mediaType: "video" | "audio";
  icon: "video" | "music";
}
