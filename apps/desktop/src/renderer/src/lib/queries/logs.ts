import { useQuery } from "@tanstack/react-query";
import { logsApi, type LogEntry } from "@/lib/api/logs";

export const useLogsHistory = () => {
  return useQuery({
    queryKey: ["logs", "history"],
    queryFn: async (): Promise<LogEntry[]> => {
      const logs = await logsApi.getLogsHistory();
      return logs as LogEntry[];
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 1000
  });
};
