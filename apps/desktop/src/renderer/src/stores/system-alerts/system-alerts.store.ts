import { create } from "zustand";

export type UpdateStatus = "idle" | "available" | "downloading" | "downloaded" | "error";

export interface SystemAlerts {
  offline: boolean;
  lowDisk: boolean;
  updateAvailable: boolean;
  diskSpaceFree: number; // in bytes
  diskSizeTotal: number; // in bytes
  updateVersion: string | null;
  updateProgress: number | null; // 0-100
  updateError: string | null;
  updateStatus: UpdateStatus;
}

export interface SystemAlertsState {
  alerts: SystemAlerts;
}

export interface SystemAlertsActions {
  setOffline: (offline: boolean) => void;
  setLowDisk: (lowDisk: boolean, freeSpace?: number) => void;
  setUpdateAvailable: (available: boolean, version?: string) => void;
  setDiskSpace: (freeBytes: number, totalBytes: number) => void;
  dismissUpdateAlert: () => void;
  setUpdateProgress: (percent: number) => void;
  setUpdateError: (error: string) => void;
  setUpdateStatus: (status: UpdateStatus) => void;
}

export type SystemAlertsStore = SystemAlertsState & SystemAlertsActions;

const initialState: SystemAlerts = {
  offline: false,
  lowDisk: false,
  updateAvailable: false,
  diskSpaceFree: 0,
  diskSizeTotal: 0,
  updateVersion: null,
  updateProgress: null,
  updateError: null,
  updateStatus: "idle"
};

export const useSystemAlertsStore = create<SystemAlertsStore>((set) => ({
  alerts: initialState,

  setOffline: (offline: boolean) =>
    set((state) => ({
      alerts: { ...state.alerts, offline }
    })),

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
        updateVersion: version ?? state.alerts.updateVersion,
        updateStatus: available ? "available" : "idle"
      }
    })),

  setDiskSpace: (freeBytes: number, totalBytes: number) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        diskSpaceFree: freeBytes,
        diskSizeTotal: totalBytes,
        lowDisk: freeBytes < 1 * 1024 * 1024 * 1024 // Less than 1GB
      }
    })),

  dismissUpdateAlert: () =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        updateAvailable: false,
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
