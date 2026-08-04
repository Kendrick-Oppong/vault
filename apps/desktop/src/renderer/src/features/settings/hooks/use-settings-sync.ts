import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";

/**
 * Syncs renderer-side settings to the main process whenever they change.
 */
export const useSettingsSync = () => {
  const settings = useSettingsStore(selectSettings);
  const prevRef = useRef({
    minimizeToTray: settings.minimizeToTray,
    clipboardDetection: settings.clipboardDetection
  });

  useEffect(() => {
    const prev = prevRef.current;
    const changed =
      prev.minimizeToTray !== settings.minimizeToTray ||
      prev.clipboardDetection !== settings.clipboardDetection;

    if (changed) {
      globalThis.api.settingsSync({
        minimizeToTray: settings.minimizeToTray,
        clipboardDetection: settings.clipboardDetection
      });
      prevRef.current = {
        minimizeToTray: settings.minimizeToTray,
        clipboardDetection: settings.clipboardDetection
      };
    }
  }, [settings.minimizeToTray, settings.clipboardDetection]);
};
