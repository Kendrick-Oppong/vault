export type VideoContainer = "mp4" | "mkv";

export interface Settings {
  downloadPath: string;
  outputTemplate: string;
  playlistFetchLimit: number;
  concurrentDownloads: number;
  minimizeToTray: boolean;
  bandwidthLimit: string;
  proxy: string;
  geoBypass: boolean;
  cookiesFromBrowser: string | null;
  cookiesFilePath: string;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  embedChapters: boolean;
  sponsorBlock: boolean;
  writeSubtitles: boolean;
  subtitleLangs: string[];
  videoContainer: VideoContainer;
  version: string;
  ytDlpVersion: string;
}

export interface DetectedBrowser {
  name: string;
  label: string;
}

export interface CookieInfo {
  browser: string;
  effectiveBrowser: string | null;
  effectiveLabel: string | null;
  cached: boolean;
  ageMs: number | null;
  detected: DetectedBrowser[];
}
