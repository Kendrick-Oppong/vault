export const historyApi = {
  list: (limit?: number, offset?: number) => globalThis.api.getHistory(limit, offset),
  openInFolder: (filePath: string) => globalThis.api.openInFolder(filePath)
};
