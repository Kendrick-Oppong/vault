import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Settings } from "@/features/settings/types";

// Sentinel used before the store is hydrated with real values from the main process.
// The empty string for downloadPath signals "not yet initialized".
const UNSET = "__unset__";

export interface SettingsState {
  settings: Settings;
  /**
   * True once `initializeFromSystem` has been called and the main process
   * has responded with the real default values.
   */
  isReady: boolean;
}

export interface SettingsActions {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
  /**
   * Called once on app boot to fill in values that can only be resolved
   * from the main process (app version, yt-dlp version, Videos folder path).
   * Only sets fields that are still at their unset sentinel value so that
   * user-persisted overrides are not clobbered.
   */
  initializeFromSystem: (info: {
    appVersion: string;
    ytDlpVersion: string;
    defaultDownloadPath: string;
  }) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

/** Fields the user configures, with safe application-level defaults. */
const baseDefaults: Settings = {
  downloadPath: UNSET,
  outputTemplate: "%(title)s.%(ext)s",
  playlistFetchLimit: 200,
  concurrentDownloads: 3,
  minimizeToTray: true,
  bandwidthLimit: "",
  proxy: "",
  geoBypass: true,
  cookiesFromBrowser: null,
  cookiesFilePath: "",
  embedThumbnail: true,
  embedMetadata: true,
  embedChapters: true,
  sponsorBlock: false,
  writeSubtitles: false,
  subtitleLangs: ["en"],
  videoContainer: "mp4",
  useDownloadArchive: false,
  version: UNSET,
  ytDlpVersion: UNSET
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: baseDefaults,
      isReady: false,

      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value }
        })),

      resetSettings: () =>
        set({
          settings: baseDefaults,
          isReady: false
        }),

      initializeFromSystem: ({ appVersion, ytDlpVersion, defaultDownloadPath }) =>
        set((state) => ({
          isReady: true,
          settings: {
            ...state.settings,
            // Only overwrite if still at the unset sentinel (i.e. fresh install or after reset)
            version: state.settings.version === UNSET ? appVersion : state.settings.version,
            ytDlpVersion:
              state.settings.ytDlpVersion === UNSET ? ytDlpVersion : state.settings.ytDlpVersion,
            downloadPath:
              state.settings.downloadPath === UNSET
                ? defaultDownloadPath
                : state.settings.downloadPath,
            // Ensure outputTemplate and playlistFetchLimit have defaults if empty
            outputTemplate: state.settings.outputTemplate || baseDefaults.outputTemplate,
            playlistFetchLimit:
              state.settings.playlistFetchLimit === 0
                ? 0
                : state.settings.playlistFetchLimit || baseDefaults.playlistFetchLimit
          }
        }))
    }),
    {
      name: "vault-settings",
      storage: createJSONStorage(() => localStorage),
      //re-initialize on boot
      partialize: (state) => ({ settings: state.settings })
    }
  )
);
