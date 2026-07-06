// Shared types between main and renderer

export interface JobMeta {
  videoId?: string
  title?: string
  channel?: string
  thumbnailUrl?: string
  expectedPath?: string
}

export interface JobInput {
  url: string
  outputTemplate: string
  formatSelector: string
  extra?: DownloadExtras
  meta?: JobMeta
}

export interface Job extends JobInput {
  id: string
  status: JobStatus
  createdAt: number
}

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'

export interface DownloadExtras {
  cookiesFromBrowser?: 'chrome' | 'firefox' | 'safari' | 'edge'
  rateLimit?: string
  proxy?: string
  geoBypass?: boolean
  embedThumbnail?: boolean
  embedMetadata?: boolean
  subtitles?: 'external' | 'burned'
  downloadArchive?: string
  archiveKey?: string
}

export interface YtDlpProgress {
  status?: string
  downloaded_bytes?: number
  total_bytes?: number
  total_bytes_estimate?: number
  speed?: number
  eta?: number
  filename?: string
  [key: string]: unknown
}

export interface HistoryEntry {
  job_id: string
  video_id: string | null
  title: string | null
  channel: string | null
  url: string
  file_path: string | null
  thumbnail_url: string | null
  status: string
  created_at: number
  completed_at: number
}
