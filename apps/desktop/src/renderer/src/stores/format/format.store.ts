import { create } from "zustand";
import type { PresetType, ContainerType, FormatPreset, AudioCodec, AudioBitrate } from "@/features/format-picker/types";

export interface FormatState {
  selectedPreset: PresetType | null;
  customFormat: string;
  container: ContainerType;
  audioCodec: AudioCodec;
  audioBitrate: AudioBitrate;
  isCustomMode: boolean;
}

export interface FormatActions {
  selectPreset: (preset: PresetType) => void;
  setCustomFormat: (format: string) => void;
  setContainer: (container: ContainerType) => void;
  setAudioCodec: (codec: AudioCodec) => void;
  setAudioBitrate: (bitrate: AudioBitrate) => void;
  setIsCustomMode: (custom: boolean) => void;
  reset: () => void;
}

export type FormatStore = FormatState & FormatActions;

const PRESETS: Record<PresetType, FormatPreset> = {
  "best-mp4": {
    id: "best-mp4",
    name: "Best MP4",
    description: "Highest quality video + audio merged into MP4",
    formatSelector: "bestvideo+bestaudio/best",
    container: "mp4",
    mediaType: "video",
    icon: "video"
  },
  "1080p-mp4": {
    id: "1080p-mp4",
    name: "1080p MP4",
    description: "1080p video + audio merged into MP4",
    formatSelector: "bestvideo[height<=1080]+bestaudio/best",
    container: "mp4",
    mediaType: "video",
    icon: "video"
  },
  "720p-mp4": {
    id: "720p-mp4",
    name: "720p MP4",
    description: "720p video + audio merged into MP4",
    formatSelector: "bestvideo[height<=720]+bestaudio/best",
    container: "mp4",
    mediaType: "video",
    icon: "video"
  },
  "best-mkv": {
    id: "best-mkv",
    name: "Best MKV",
    description: "Highest quality video + audio merged into MKV",
    formatSelector: "bestvideo+bestaudio/best",
    container: "mkv",
    mediaType: "video",
    icon: "video"
  },
  "audio-mp3": {
    id: "audio-mp3",
    name: "Audio MP3",
    description: "Audio-only extraction as MP3 (320kbps)",
    formatSelector: "bestaudio/best",
    mediaType: "audio",
    icon: "music"
  },
  "audio-flac": {
    id: "audio-flac",
    name: "Audio FLAC",
    description: "Audio-only extraction as FLAC (lossless)",
    formatSelector: "bestaudio/best",
    mediaType: "audio",
    icon: "music"
  }
};

const initialState: FormatState = {
  selectedPreset: "best-mp4",
  customFormat: "bestvideo+bestaudio/best",
  container: "mp4",
  audioCodec: "mp3",
  audioBitrate: "320k",
  isCustomMode: false
};

export const useFormatStore = create<FormatStore>((set) => ({
  ...initialState,

  selectPreset: (preset: PresetType) => {
    const selectedPreset = PRESETS[preset];
    set({
      selectedPreset: preset,
      customFormat: selectedPreset.formatSelector,
      container: selectedPreset.container || "mp4",
      isCustomMode: false
    });
  },

  setCustomFormat: (format: string) => set({ customFormat: format }),
  setContainer: (container: ContainerType) => set({ container }),
  setAudioCodec: (codec: AudioCodec) => set({ audioCodec: codec }),
  setAudioBitrate: (bitrate: AudioBitrate) => set({ audioBitrate: bitrate }),
  setIsCustomMode: (custom: boolean) => set({ isCustomMode: custom }),

  reset: () => set(initialState)
}));

export const getPresets = (): FormatPreset[] => Object.values(PRESETS);
export const getPresetById = (id: PresetType): FormatPreset => PRESETS[id];
