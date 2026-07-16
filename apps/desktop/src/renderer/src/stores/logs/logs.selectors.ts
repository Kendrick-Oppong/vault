import { useShallow } from "zustand/react/shallow";
import { useLogsStore } from "./logs.store";

export const useLogsState = () =>
  useLogsStore(
    useShallow((state) => ({
      entries: state.entries,
      filter: state.filter
    }))
  );

export const useLogsActions = () =>
  useLogsStore(
    useShallow((state) => ({
      addLog: state.addLog,
      clearLogs: state.clearLogs,
      setFilter: state.setFilter,
      removeLogs: state.removeLogs
    }))
  );

export const selectFilteredLogs = (state: ReturnType<typeof useLogsStore.getState>) => {
  const { entries, filter } = state;
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.level === filter);
};
