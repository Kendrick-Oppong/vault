import { useShallow } from "zustand/react/shallow";
import type { SystemAlertsStore } from "./system-alerts.store";
import { useSystemAlertsStore } from "./system-alerts.store";

export const useSystemAlertsState = () =>
  useSystemAlertsStore(
    useShallow((state) => ({
      offline: state.alerts.offline,
      lowDisk: state.alerts.lowDisk,
      updateAvailable: state.alerts.updateAvailable,
      diskSpaceFree: state.alerts.diskSpaceFree
    }))
  );

export const useSystemAlertsActions = () =>
  useSystemAlertsStore(
    useShallow((state) => ({
      setOffline: state.setOffline,
      setLowDisk: state.setLowDisk,
      setUpdateAvailable: state.setUpdateAvailable,
      setDiskSpace: state.setDiskSpace,
      dismissUpdateAlert: state.dismissUpdateAlert
    }))
  );

export const selectOfflineAlert = (state: SystemAlertsStore) => state.alerts.offline;
export const selectLowDiskAlert = (state: SystemAlertsStore) => state.alerts.lowDisk;
export const selectUpdateAlert = (state: SystemAlertsStore) => state.alerts.updateAvailable;
export const selectDiskSpace = (state: SystemAlertsStore) => state.alerts.diskSpaceFree;
