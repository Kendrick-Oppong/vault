import { useEffect } from "react";
import { useAppInfo } from "@/lib/queries/app";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";

/**
 * Fetches system information from the main process (app version, yt-dlp version,
 * default download path) and seeds the settings store with real values.
 *
 * Must be called once at the root of the app. It is safe to call on every render
 * because the store only applies the values when the sentinel is still present.
 */
export function useAppInfoInit() {
  const { data } = useAppInfo();
  const initializeFromSystem = useSettingsStore((s) => s.initializeFromSystem);
  const settings = useSettingsStore(selectSettings);

  useEffect(() => {
    if (data) {
      initializeFromSystem(data);
    }
  }, [data, initializeFromSystem]);

  // Sync autoUpdateApp setting to main process
  useEffect(() => {
    if (settings.autoUpdateApp !== undefined && globalThis.api?.settingsSetAutoUpdateApp) {
      globalThis.api.settingsSetAutoUpdateApp(settings.autoUpdateApp);
    }
  }, [settings.autoUpdateApp]);

  // Sync notifications setting to main process
  useEffect(() => {
    if (settings.notifications !== undefined && globalThis.api?.settingsSetNotifications) {
      globalThis.api.settingsSetNotifications(settings.notifications);
    }
  }, [settings.notifications]);
}
