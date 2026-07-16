import { create } from "zustand";

export interface SystemAlerts {
  offline: boolean;
  lowDisk: boolean;
  updateAvailable: boolean;
  diskSpaceFree: number; // in bytes
}

export interface SystemAlertsState {
  alerts: SystemAlerts;
}

export interface SystemAlertsActions {
  setOffline: (offline: boolean) => void;
  setLowDisk: (lowDisk: boolean, freeSpace?: number) => void;
  setUpdateAvailable: (available: boolean) => void;
  setDiskSpace: (bytes: number) => void;
  dismissUpdateAlert: () => void;
}

export type SystemAlertsStore = SystemAlertsState & SystemAlertsActions;

const initialState: SystemAlerts = {
  offline: false,
  lowDisk: false,
  updateAvailable: false,
  diskSpaceFree: 0
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

  setUpdateAvailable: (available: boolean) =>
    set((state) => ({
      alerts: { ...state.alerts, updateAvailable: available }
    })),

  setDiskSpace: (bytes: number) =>
    set((state) => ({
      alerts: {
        ...state.alerts,
        diskSpaceFree: bytes,
        lowDisk: bytes < 2 * 1024 * 1024 * 1024 // Less than 2GB
      }
    })),

  dismissUpdateAlert: () =>
    set((state) => ({
      alerts: { ...state.alerts, updateAvailable: false }
    }))
}));
