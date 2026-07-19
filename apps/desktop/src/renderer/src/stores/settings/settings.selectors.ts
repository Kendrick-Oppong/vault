import type { SettingsStore } from "./settings.store";
import { useSettingsStore } from "./settings.store";
import { useShallow } from "zustand/react/shallow";

export const selectSettings = (state: SettingsStore) => state.settings;
export const selectIsReady = (state: SettingsStore) => state.isReady;
export const selectPlaylistFetchLimit = (state: SettingsStore) => state.settings.playlistFetchLimit;

const selectSettingsActions = (state: SettingsStore) => ({
  updateSetting: state.updateSetting,
  resetSettings: state.resetSettings,
  initializeFromSystem: state.initializeFromSystem
});

export const useSettingsActions = () => {
  return useSettingsStore(useShallow(selectSettingsActions));
};

export const usePlaylistFetchLimit = () => {
  return useSettingsStore(selectPlaylistFetchLimit);
};
