import type { JobInput } from "@vault/types";

export const downloadsApi = {
  probeFormats: (url: string) => globalThis.api.probeFormats(url),
  queueDownload: (input: JobInput) => globalThis.api.queueDownload(input),
  cancelDownload: (jobId: string) => globalThis.api.cancelDownload(jobId),
  pauseDownload: (jobId: string) => globalThis.api.pauseDownload(jobId),
  resumeDownload: (jobId: string) => globalThis.api.resumeDownload(jobId),
  retryDownload: (jobId: string) => globalThis.api.retryDownload(jobId),
  setConcurrency: (n: number) => globalThis.api.setConcurrency(n)
};
