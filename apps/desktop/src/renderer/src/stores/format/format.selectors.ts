import { useShallow } from "zustand/react/shallow";
import type { FormatStore } from "./format.store";
import type { PresetType } from "@/features/format-picker/types";
import { useFormatStore, getPresets, getPresetById } from "./format.store";

const selectFormatState = (state: FormatStore) => ({
  selectedPreset: state.selectedPreset,
  customFormat: state.customFormat,
  container: state.container,
  audioCodec: state.audioCodec,
  audioBitrate: state.audioBitrate,
  isCustomMode: state.isCustomMode
});

const selectFormatActions = (state: FormatStore) => ({
  selectPreset: state.selectPreset,
  setCustomFormat: state.setCustomFormat,
  setContainer: state.setContainer,
  setAudioCodec: state.setAudioCodec,
  setAudioBitrate: state.setAudioBitrate,
  setIsCustomMode: state.setIsCustomMode,
  reset: state.reset
});

export const useFormatState = () => useFormatStore(useShallow(selectFormatState));
export const useFormatActions = () => useFormatStore(useShallow(selectFormatActions));

export const selectSelectedPreset = (state: FormatStore) => state.selectedPreset;
export const selectCustomFormat = (state: FormatStore) => state.customFormat;
export const selectContainer = (state: FormatStore) => state.container;
export const selectAudioCodec = (state: FormatStore) => state.audioCodec;
export const selectAudioBitrate = (state: FormatStore) => state.audioBitrate;
export const selectIsCustomMode = (state: FormatStore) => state.isCustomMode;

export const useFormatPresets = () => getPresets();
export const useFormatPresetById = (id: string) => getPresetById(id as any);
