export interface LogEntry {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: number;
}

export const logsApi = {
  getLogsHistory: () => globalThis.api.getLogsHistory()
};
