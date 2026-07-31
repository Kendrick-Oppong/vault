import { useEffect } from "react";
import { useSystemAlertsActions } from "@/stores/system-alerts/system-alerts.selectors";

export function useUpdateEvents() {
  const {
    setUpdateAvailable,
    setUpdateNotAvailable,
    setUpdateDownloaded,
    setUpdateProgress,
    setUpdateError,
    setUpdateStatus
  } = useSystemAlertsActions();

  useEffect(() => {
    if (!globalThis.api) return;

    const unsubAvailable = globalThis.api.onUpdateAvailable((info) => {
      setUpdateAvailable(true, info.version);
    });

    const unsubNotAvailable = globalThis.api.onUpdateNotAvailable(() => {
      setUpdateNotAvailable();
    });

    const unsubDownloaded = globalThis.api.onUpdateDownloaded((info) => {
      setUpdateDownloaded(info.version);
    });

    const unsubProgress = globalThis.api.onUpdateProgress((info) => {
      setUpdateProgress(info.percent);
      setUpdateStatus("downloading");
    });

    const unsubError = globalThis.api.onUpdateError((error) => {
      setUpdateError(error.message);
      setUpdateStatus("error");
    });

    const unsubChecking = globalThis.api.onUpdateChecking(() => {
      // Optional: set a "checking" status if you want to show a spinner
    });

    return () => {
      unsubAvailable();
      unsubNotAvailable();
      unsubDownloaded();
      unsubProgress();
      unsubError();
      unsubChecking();
    };
  }, [
    setUpdateAvailable,
    setUpdateNotAvailable,
    setUpdateDownloaded,
    setUpdateProgress,
    setUpdateError,
    setUpdateStatus
  ]);
}
