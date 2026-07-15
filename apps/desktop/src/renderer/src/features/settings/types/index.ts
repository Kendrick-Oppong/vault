export interface Settings {
  downloadPath: string;
  concurrentDownloads: number;
  minimizeToTray: boolean;
  bandwidthLimit: string;
  proxy: string;
  geoBypass: boolean;
  importCookies: "None" | "Chrome" | "Firefox" | "Edge" | "Safari" | "File";
  cookiesFilePath: string;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  version: string;
  ytDlpVersion: string;
}
