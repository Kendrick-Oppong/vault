import type { JobInput } from '@vault/types'

export const downloadsApi = {
  probeFormats: (url: string) => globalThis.api.probeFormats(url),
  queueDownload: (input: JobInput) => globalThis.api.queueDownload(input),
  cancelDownload: (jobId: string) => globalThis.api.cancelDownload(jobId),
  setConcurrency: (n: number) => globalThis.api.setConcurrency(n)
}
