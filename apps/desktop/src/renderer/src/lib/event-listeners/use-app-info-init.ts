import { useEffect } from "react";
import { useAppInfo } from "@/lib/queries/app";
import { useSettingsStore } from "@/stores/settings/settings.store";

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

  useEffect(() => {
    if (data) {
      initializeFromSystem(data);
    }
  }, [data, initializeFromSystem]);
}
