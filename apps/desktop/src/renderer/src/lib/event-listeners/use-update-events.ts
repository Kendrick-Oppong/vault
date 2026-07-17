import { useEffect } from "react";
import { useSystemAlertsActions } from "@/stores/system-alerts/system-alerts.selectors";

export function useUpdateEvents() {
  const { setUpdateAvailable } = useSystemAlertsActions();

  useEffect(() => {
    if (!globalThis.api) return;

    const unsubAvailable = globalThis.api.onUpdateAvailable(() => {
      setUpdateAvailable(true);
    });

    const unsubDownloaded = globalThis.api.onUpdateDownloaded(() => {
      // Update downloaded - just set the alert, no notification
      setUpdateAvailable(true);
    });

    return () => {
      unsubAvailable();
      unsubDownloaded();
    };
  }, [setUpdateAvailable]);
}
