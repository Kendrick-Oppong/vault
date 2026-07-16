import type { JobInput } from "@vault/types";

export const downloadsApi = {
  probeFormats: (url: string) => globalThis.api.probeFormats(url),
  queueDownload: (input: JobInput) => globalThis.api.queueDownload(input),
  cancelDownload: (jobId: string) => globalThis.api.cancelDownload(jobId),
  pauseDownload: (jobId: string) => globalThis.api.pauseDownload(jobId),
  resumeDownload: (jobId: string) => globalThis.api.resumeDownload(jobId),
  retryDownload: (jobId: string) => globalThis.api.retryDownload(jobId),
  setConcurrency: (n: number) => globalThis.api.setConcurrency(n),
  searchYoutube: (query: string, page?: number) => globalThis.api.searchYoutube(query, page),
  listSubtitles: (url: string) => globalThis.api.listSubtitles(url),
  dependenciesCheck: () => globalThis.api.dependenciesCheck()
};

export const appApi = {
  getInfo: () => globalThis.api.getAppInfo(),
  checkForUpdates: () => globalThis.api.checkForUpdates(),
  installUpdate: () => globalThis.api.installUpdate(),
  quitApp: () => globalThis.api.quitApp()
};
