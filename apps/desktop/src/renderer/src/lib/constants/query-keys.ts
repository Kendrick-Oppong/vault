export const QueryKeys = {
  formats: {
    probe: (url: string) => ["formats", "probe", url] as const
  },
  history: {
    all: (limit?: number, offset?: number) => ["history", { limit, offset }] as const
  },
  jobs: {
    active: () => ["jobs", "active"] as const,
    progress: (jobId: string) => ["jobs", "progress", jobId] as const
  }
} as const;
