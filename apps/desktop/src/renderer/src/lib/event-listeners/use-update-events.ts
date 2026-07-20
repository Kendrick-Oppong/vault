import { useEffect } from "react";
import { useSystemAlertsActions } from "@/stores/system-alerts/system-alerts.selectors";

export function useUpdateEvents() {
  const { setUpdateAvailable, setUpdateProgress, setUpdateError, setUpdateStatus } =
    useSystemAlertsActions();

  useEffect(() => {
    if (!globalThis.api) return;

    const unsubAvailable = globalThis.api.onUpdateAvailable((info) => {
      setUpdateAvailable(true, info.version);
    });

    const unsubDownloaded = globalThis.api.onUpdateDownloaded((info) => {
      setUpdateAvailable(true, info.version);
      setUpdateStatus("downloaded");
    });

    const unsubProgress = globalThis.api.onUpdateProgress((info) => {
      setUpdateProgress(info.percent);
    });

    const unsubError = globalThis.api.onUpdateError((error) => {
      setUpdateError(error.message);
    });

    return () => {
      unsubAvailable();
      unsubDownloaded();
      unsubProgress();
      unsubError();
    };
  }, [setUpdateAvailable, setUpdateProgress, setUpdateError, setUpdateStatus]);
}
