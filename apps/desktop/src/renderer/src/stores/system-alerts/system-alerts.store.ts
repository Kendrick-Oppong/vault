import { create } from "zustand";

export type UpdateStatus = "idle" | "available" | "downloading" | "downloaded" | "error";

export interface SystemAlerts {
  offline: boolean;
  networkRestored: boolean;
  lowDisk: boolean;
  updateAvailable: boolean;
  updateDownloaded: boolean;
  diskSpaceFree: number;
  diskSizeTotal: number;
  updateVersion: string | null;
  updateProgress: number | null;
  updateError: string | null;
  updateStatus: UpdateStatus;
}

export interface SystemAlertsState {
  alerts: SystemAlerts;
}

export interface SystemAlertsActions {
  setOffline: (offline: boolean) => void;
  setNetworkRestored: (restored: boolean) => void;
  setLowDisk: (lowDisk: boolean, freeSpace?: number) => void;
  setUpdateAvailable: (available: boolean, version?: string) => void;
  setUpdateNotAvailable: () => void;
  setUpdateDownloaded: (version?: string) => void;
  setDiskSpace: (freeBytes: number, totalBytes: number) => void;
  dismissUpdateAlert: () => void;
  setUpdateProgress: (percent: number) => void;
  setUpdateError: (error: string) => void;
  setUpdateStatus: (status: UpdateStatus) => void;
}

export type SystemAlertsStore = SystemAlertsState & SystemAlertsActions;

const initialState: SystemAlerts = {
  offline: false,
  networkRestored: false,
  lowDisk: false,
  updateAvailable: false,
  updateDownloaded: false,
  diskSpaceFree: 0,
  diskSizeTotal: 0,
  updateVersion: null,
  updateProgress: null,
  updateError: null,
  updateStatus: "idle"
};

export const useSystemAlertsStore = create<SystemAlertsStore>((set) => ({
  alerts: initialState,

  setOffline: (offline: boolean) => set((state) => ({ alerts: { ...state.alerts, offline } })),

  setNetworkRestored: (restored: boolean) =>
    set((state) => ({ alerts: { ...state.alerts, networkRestored: restored } })),

  setLowDisk: (lowDisk: boolean, freeSpace?: number) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        lowDisk,
        diskSpaceFree: freeSpace ?? state.alerts.diskSpaceFree
      }
    })),

  setUpdateAvailable: (available: boolean, version?: string) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        updateAvailable: available,
        updateDownloaded: false,
        updateVersion: version ?? state.alerts.updateVersion,
        updateStatus: available ? "available" : "idle",
        updateError: null
      }
    })),

  setUpdateNotAvailable: () =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        updateAvailable: false,
        updateDownloaded: false,
        updateStatus: "idle"
      }
    })),

  setUpdateDownloaded: (version?: string) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        updateAvailable: true,
        updateDownloaded: true,
        updateVersion: version ?? state.alerts.updateVersion,
        updateStatus: "downloaded",
        updateProgress: null,
        updateError: null
      }
    })),

  setDiskSpace: (freeBytes: number, totalBytes: number) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        diskSpaceFree: freeBytes,
        diskSizeTotal: totalBytes,
        lowDisk: freeBytes > 0 && freeBytes < 1 * 1024 * 1024 * 1024
      }
    })),

  dismissUpdateAlert: () =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        updateAvailable: false,
        updateDownloaded: false,
        updateStatus: "idle",
        updateProgress: null,
        updateError: null
      }
    })),

  setUpdateProgress: (percent: number) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        updateProgress: percent,
        updateStatus: "downloading"
      }
    })),

  setUpdateError: (error: string) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        updateError: error,
        updateStatus: "error",
        updateProgress: null
      }
    })),

  setUpdateStatus: (status: UpdateStatus) =>
    set((state) => ({
      alerts: { ...state.alerts, updateStatus: status }
    }))
}));
