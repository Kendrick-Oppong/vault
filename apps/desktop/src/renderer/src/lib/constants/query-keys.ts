export const QueryKeys = {
  formats: {
    probe: (url: string) => ["formats", "probe", url] as const
  },
  history: {
    base: () => ["history"] as const,
    all: (limit?: number, offset?: number) => ["history", { limit, offset }] as const,
    infinite: (limit: number) => ["history", "infinite", { limit }] as const
  },
  jobs: {
    active: () => ["jobs", "active"] as const,
    progress: (jobId: string) => ["jobs", "progress", jobId] as const
  },
  auth: {
    youtube: () => ["auth", "youtube"] as const
  },
  cookies: {
    info: (browserSetting: string | null) => ["cookies", "info", browserSetting] as const
  },
  search: {
    youtube: (query: string, page?: number) => ["search", "youtube", query, page] as const
  },
  system: {
    diskSpace: () => ["system", "diskSpace"] as const
  }
} as const;
