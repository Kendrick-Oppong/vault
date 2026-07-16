import { create } from "zustand";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  context?: string;
  data?: unknown;
}

export interface LogsState {
  entries: LogEntry[];
  filter: "all" | "info" | "warn" | "error";
  maxEntries: number;
}

export interface LogsActions {
  addLog: (level: LogEntry["level"], message: string, context?: string, data?: unknown) => void;
  clearLogs: () => void;
  setFilter: (filter: LogsState["filter"]) => void;
  removeLogs: (ids: string[]) => void;
}

export type LogsStore = LogsState & LogsActions;

export const useLogsStore = create<LogsStore>((set) => ({
  entries: [],
  filter: "all",
  maxEntries: 1000,

  addLog: (level, message, context, data) =>
    set((state) => {
      const newEntry: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        level,
        message,
        context,
        data
      };

      const entries = [newEntry, ...state.entries].slice(0, state.maxEntries);
      return { entries };
    }),

  clearLogs: () =>
    set({
      entries: []
    }),

  setFilter: (filter) =>
    set({
      filter
    }),

  removeLogs: (ids) =>
    set((state) => ({
      entries: state.entries.filter((entry) => !ids.includes(entry.id))
    }))
}));
