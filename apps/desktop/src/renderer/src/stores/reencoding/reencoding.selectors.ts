import { useShallow } from "zustand/react/shallow";
import type { ReencodeStore } from "./reencoding.store";
import { useReencodeStore } from "./reencoding.store";

const selectReencodeState = (state: ReencodeStore) => ({
  enableReencoding: state.enableReencoding,
  format: state.format,
  videoPreset: state.videoPreset,
  videoCrf: state.videoCrf,
  audioBitrate: state.audioBitrate,
  stripAudio: state.stripAudio
});

const selectReencodeActions = (state: ReencodeStore) => ({
  setEnableReencoding: state.setEnableReencoding,
  setFormat: state.setFormat,
  setVideoPreset: state.setVideoPreset,
  setVideoCrf: state.setVideoCrf,
  setAudioBitrate: state.setAudioBitrate,
  setStripAudio: state.setStripAudio,
  reset: state.reset
});

export const useReencodeState = () => useReencodeStore(useShallow(selectReencodeState));
export const useReencodeActions = () => useReencodeStore(useShallow(selectReencodeActions));

export const selectReencodeEnabled = (state: ReencodeStore) => state.enableReencoding;
export const selectReencodeFormat = (state: ReencodeStore) => state.format;
export const selectReencodeVideoPreset = (state: ReencodeStore) => state.videoPreset;
export const selectReencodeVideoCrf = (state: ReencodeStore) => state.videoCrf;
export const selectReencodeAudioBitrate = (state: ReencodeStore) => state.audioBitrate;
export const selectReencodeStripAudio = (state: ReencodeStore) => state.stripAudio;
