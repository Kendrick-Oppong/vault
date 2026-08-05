import type { HistoryFilters } from "@/features/history/types";

export const historyApi = {
  list: (limit?: number, offset?: number, filters?: HistoryFilters) =>
    globalThis.api.getHistory(limit, offset, filters),

  delete: (jobId: string) => globalThis.api.deleteHistory(jobId),
  bulkDelete: (jobIds: string[]) => globalThis.api.bulkDeleteHistory(jobIds)
};
