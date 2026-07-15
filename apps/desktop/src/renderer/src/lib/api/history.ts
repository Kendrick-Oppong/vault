export const historyApi = {
  list: (limit?: number, offset?: number) => globalThis.api.getHistory(limit, offset),
  delete: (jobId: string) => globalThis.api.deleteHistory(jobId)
};
