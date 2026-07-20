import type { JobInput } from "@vault/types";

export const downloadsApi = {
  probeFormats: (url: string, playlistLimit?: number) =>
    globalThis.api.probeFormats(url, playlistLimit),
  probePlaylistPage: (url: string, start: number, end: number) =>
    globalThis.api.probePlaylistPage(url, start, end),
  queueDownload: (input: JobInput) => globalThis.api.queueDownload(input),
  cancelDownload: (jobId: string) => globalThis.api.cancelDownload(jobId),
  pauseDownload: (jobId: string) => globalThis.api.pauseDownload(jobId),
  pauseAllDownloads: () => globalThis.api.pauseAllDownloads(),
  resumeDownload: (jobId: string) => globalThis.api.resumeDownload(jobId),
  retryDownload: (jobId: string) => globalThis.api.retryDownload(jobId),
  setConcurrency: (n: number) => globalThis.api.setConcurrency(n),
  searchYoutube: (query: string, page?: number) => globalThis.api.searchYoutube(query, page),
  listSubtitles: (url: string) => globalThis.api.listSubtitles(url),
  dependenciesCheck: () => globalThis.api.dependenciesCheck(),
  dependenciesDownload: () => globalThis.api.dependenciesDownload(),
  getJobs: () => globalThis.api.getJobs(),
  openFile: (filePath: string) => globalThis.api.openFile(filePath),
  revealFile: (filePath: string) => globalThis.api.openInFolder(filePath),
  fileExists: (filePath: string) => globalThis.api.fileExists(filePath),
  checkDiskSpace: (path: string) => globalThis.api.checkDiskSpace(path)
};
