import { create } from "zustand";
import type { ReencodeFormat, VideoPreset, AudioBitrate } from "@/features/reencoding/types";

export interface ReencodeState {
  enableReencoding: boolean;
  format: ReencodeFormat;
  videoPreset: VideoPreset;
  videoCrf: number; // 0-51, lower is better quality
  audioBitrate: AudioBitrate;
  stripAudio: boolean;
}

export interface ReencodeActions {
  setEnableReencoding: (enable: boolean) => void;
  setFormat: (format: ReencodeFormat) => void;
  setVideoPreset: (preset: VideoPreset) => void;
  setVideoCrf: (crf: number) => void;
  setAudioBitrate: (bitrate: AudioBitrate) => void;
  setStripAudio: (strip: boolean) => void;
  reset: () => void;
}

export type ReencodeStore = ReencodeState & ReencodeActions;

const initialState: ReencodeState = {
  enableReencoding: false,
  format: "none",
  videoPreset: "slow",
  videoCrf: 18,
  audioBitrate: "192k",
  stripAudio: false
};

export const useReencodeStore = create<ReencodeStore>((set) => ({
  ...initialState,

  setEnableReencoding: (enable: boolean) => set({ enableReencoding: enable }),
  setFormat: (format: ReencodeFormat) => set({ format }),
  setVideoPreset: (preset: VideoPreset) => set({ videoPreset: preset }),
  setVideoCrf: (crf: number) => set({ videoCrf: Math.min(51, Math.max(0, crf)) }),
  setAudioBitrate: (bitrate: AudioBitrate) => set({ audioBitrate: bitrate }),
  setStripAudio: (strip: boolean) => set({ stripAudio: strip }),

  reset: () => set(initialState)
}));
