import type { SettingsStore } from "./settings.store";
import { useSettingsStore } from "./settings.store";
import { useShallow } from "zustand/react/shallow";

export const selectSettings = (state: SettingsStore) => state.settings;
export const selectIsReady = (state: SettingsStore) => state.isReady;

const selectSettingsActions = (state: SettingsStore) => ({
  updateSetting: state.updateSetting,
  resetSettings: state.resetSettings,
  initializeFromSystem: state.initializeFromSystem
});

export const useSettingsActions = () => {
  return useSettingsStore(useShallow(selectSettingsActions));
};
