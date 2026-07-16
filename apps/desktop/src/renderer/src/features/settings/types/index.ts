export interface Settings {
  downloadPath: string;
  outputTemplate?: string;
  concurrentDownloads: number;
  minimizeToTray: boolean;
  bandwidthLimit: string;
  proxy: string;
  geoBypass: boolean;
  // Browser cookie import: 'auto', browser name, or null/'' for disabled
  cookiesFromBrowser: string | null;
  cookiesFilePath: string;
  embedThumbnail: boolean;
  embedMetadata: boolean;
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
