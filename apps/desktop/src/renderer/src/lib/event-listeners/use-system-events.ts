import { useEffect } from "react";
import { useSystemAlertsActions } from "@/stores/system-alerts/system-alerts.selectors";
import { usePauseAllDownloads } from "@/lib/mutations/downloads";
import { useDiskSpace } from "@/lib/queries/system";

// Low disk threshold: 1 GB
const LOW_DISK_THRESHOLD_BYTES = 1 * 1024 * 1024 * 1024;

/**
 * Listens to native browser online/offline events and syncs them to the
 * system-alerts store. Also syncs disk space polling results into the store.
 * Mount this once at the app root (inside QueryClientProvider).
 */
export function useSystemEvents() {
  const { setOffline, setNetworkRestored, setDiskSpace } = useSystemAlertsActions();
  const pauseAllMutation = usePauseAllDownloads();
  const diskSpaceQuery = useDiskSpace();

  // --- Network monitoring via native browser APIs ---
  useEffect(() => {
    // Set initial state based on current connectivity
    setOffline(!navigator.onLine);

    const handleOffline = () => {
      setOffline(true);
      setNetworkRestored(false);
      // Auto-pause all active downloads when connection is lost
      pauseAllMutation.mutate();
    };

    const handleOnline = () => {
      setOffline(false);
      setNetworkRestored(true);
      // Auto-hide the "network restored" notification after 5 seconds
      setTimeout(() => {
        setNetworkRestored(false);
      }, 5000);
    };

    globalThis.addEventListener("offline", handleOffline);
    globalThis.addEventListener("online", handleOnline);

    return () => {
      globalThis.removeEventListener("offline", handleOffline);
      globalThis.removeEventListener("online", handleOnline);
    };
    // pauseAllMutation is stable (from useMutation), no need in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setOffline, setNetworkRestored]);

  // --- Disk space: push query results into the store ---
  useEffect(() => {
    if (diskSpaceQuery.data) {
      setDiskSpace(diskSpaceQuery.data.available, diskSpaceQuery.data.total);
    }
  }, [diskSpaceQuery.data, setDiskSpace]);

  // Expose the low disk threshold so alert-banners can check
  // against it independently if needed
  return {
    lowDiskThreshold: LOW_DISK_THRESHOLD_BYTES
  };
}
