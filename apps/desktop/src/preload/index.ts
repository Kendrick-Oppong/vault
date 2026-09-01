import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import type { JobInput, Job, YtDlpProgress, HistoryEntry } from "@vault/types";

declare global {
  var api: VaultApi;
}

interface HistoryFilters {
  search?: string;
  sortBy?: "title" | "date" | "size";
  sortOrder?: "asc" | "desc";
}

const vaultApi = {
  // --- Invoke methods ---
  probeFormats: (url: string, playlistLimit?: number): Promise<Record<string, unknown>[]> =>
    ipcRenderer.invoke("formats:probe", url, playlistLimit),

  probePlaylistPage: (
    url: string,
    start: number,
    end: number
  ): Promise<Record<string, unknown>[]> =>
    ipcRenderer.invoke("formats:playlistPage", url, start, end),

  queueDownload: (jobInput: JobInput): Promise<string> => ipcRenderer.invoke("queue:add", jobInput),

  cancelDownload: (jobId: string): Promise<boolean> => ipcRenderer.invoke("queue:cancel", jobId),

  pauseDownload: (jobId: string): Promise<boolean> => ipcRenderer.invoke("queue:pause", jobId),

  pauseAllDownloads: (): Promise<number> => ipcRenderer.invoke("queue:pauseAll"),

  resumeDownload: (jobId: string): Promise<string | null> =>
    ipcRenderer.invoke("queue:resume", jobId),

  retryDownload: (jobId: string): Promise<string | null> =>
    ipcRenderer.invoke("queue:retry", jobId),

  getJobs: (): Promise<Job[]> => ipcRenderer.invoke("queue:getJobs"),

  setConcurrency: (n: number): Promise<boolean> => ipcRenderer.invoke("queue:setConcurrency", n),

  getHistory: (
    limit?: number,
    offset?: number,
    filters?: HistoryFilters
  ): Promise<HistoryEntry[]> => ipcRenderer.invoke("history:list", limit, offset, filters),

  deleteHistory: (jobId: string): Promise<boolean> => ipcRenderer.invoke("history:delete", jobId),

  bulkDeleteHistory: (jobIds: string[]): Promise<boolean> =>
    ipcRenderer.invoke("history:bulkDelete", jobIds),

  openInFolder: (filePath: string): Promise<void> => ipcRenderer.invoke("fs:reveal", filePath),

  openFile: (filePath: string): Promise<string | null> => ipcRenderer.invoke("fs:open", filePath),

  readFile: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke("fs:readFile", filePath),

  fileExists: (filePath: string): Promise<boolean> => ipcRenderer.invoke("fs:fileExists", filePath),

  directoryExists: (dirPath: string): Promise<{ exists: boolean; writable: boolean }> =>
    ipcRenderer.invoke("fs:directoryExists", dirPath),

  scanDir: (dirPath: string): Promise<string[]> => ipcRenderer.invoke("fs:scanDir", dirPath),

  openFileDialog: (opts?: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null> => ipcRenderer.invoke("dialog:openFile", opts),

  openFolderDialog: (): Promise<string | null> => ipcRenderer.invoke("dialog:openFolder"),

  getCookieInfo: (
    browserSetting: string | null
  ): Promise<{
    browser: string;
    effectiveBrowser: string | null;
    effectiveLabel: string | null;
    cached: boolean;
    ageMs: number | null;
    detected: { name: string; label: string }[];
  }> => ipcRenderer.invoke("cookies:info", browserSetting),

  setCookieBrowser: (
    browserSetting: string
  ): Promise<{
    browser: string;
    effectiveBrowser: string | null;
    effectiveLabel: string | null;
    cached: boolean;
    ageMs: number | null;
    detected: { name: string; label: string }[];
  }> => ipcRenderer.invoke("cookies:set", browserSetting),

  refreshCookies: (
    browserSetting: string | null
  ): Promise<{
    browser: string;
    effectiveBrowser: string | null;
    effectiveLabel: string | null;
    cached: boolean;
    ageMs: number | null;
    detected: { name: string; label: string }[];
  }> => ipcRenderer.invoke("cookies:refresh", browserSetting),

  clearCookies: (
    browserSetting: string | null
  ): Promise<{
    browser: string;
    effectiveBrowser: string | null;
    effectiveLabel: string | null;
    cached: boolean;
    ageMs: number | null;
    detected: { name: string; label: string }[];
  }> => ipcRenderer.invoke("cookies:clear", browserSetting),

  clearFormatCache: (url?: string): Promise<void> => ipcRenderer.invoke("cache:clearFormats", url),

  clearDownloadArchive: (downloadPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("cache:clearDownloadArchive", downloadPath),

  getAppInfo: (): Promise<{
    appVersion: string;
    ytDlpVersion: string;
    defaultDownloadPath: string;
  }> => ipcRenderer.invoke("app:info"),

  dependenciesCheck: (): Promise<{
    ready: boolean;
    ytDlp: { name: string; installed: boolean; version?: string; path?: string; error?: string };
    ffmpeg: { name: string; installed: boolean; version?: string; path?: string; error?: string };
    errors: string[];
    errorMessage: string | null;
  }> => ipcRenderer.invoke("dependencies:check"),

  dependenciesDownload: (): Promise<{
    ready: boolean;
    ytDlp: { installed: boolean; version?: string; path?: string; error?: string };
    ffmpeg: { installed: boolean; version?: string; path?: string; error?: string };
    errors: string[];
    errorMessage: string | null;
  }> => ipcRenderer.invoke("dependencies:download"),

  dependenciesUpdate: (
    binary: "ytdlp" | "ffmpeg" | "all"
  ): Promise<{
    ready: boolean;
    ytDlp: { installed: boolean; version?: string; path?: string; error?: string };
    ffmpeg: { installed: boolean; version?: string; path?: string; error?: string };
    errors: string[];
    errorMessage: string | null;
  }> => ipcRenderer.invoke("dependencies:update", binary),

  settingsGetAutoUpdateApp: (): Promise<boolean> => ipcRenderer.invoke("settings:getAutoUpdateApp"),
  settingsSetAutoUpdateApp: (value: boolean): Promise<boolean> =>
    ipcRenderer.invoke("settings:setAutoUpdateApp", value),
  settingsGetNotifications: (): Promise<boolean> => ipcRenderer.invoke("settings:getNotifications"),
  settingsSetNotifications: (value: boolean): Promise<boolean> =>
    ipcRenderer.invoke("settings:setNotifications", value),

  settingsSync: (settings: {
    minimizeToTray?: boolean;
    clipboardDetection?: boolean;
    useNightlyBuilds?: boolean;
    autoUpdateBinaries?: boolean;
  }): void => {
    ipcRenderer.send("settings:sync", settings);
  },

  onDependencyDownloadProgress: (
    cb: (progress: {
      binary: "ytdlp" | "ffmpeg";
      stage: "checking" | "downloading" | "extracting" | "verifying" | "done" | "error";
      percent: number | null;
      message?: string;
    }) => void
  ): (() => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      progress: {
        binary: "ytdlp" | "ffmpeg";
        stage: "checking" | "downloading" | "extracting" | "verifying" | "done" | "error";
        percent: number | null;
        message?: string;
      }
    ) => cb(progress);
    ipcRenderer.on("dependency:download:progress", handler);
    return () => ipcRenderer.removeListener("dependency:download:progress", handler);
  },

  searchYoutube: (
    query: string,
    page?: number
  ): Promise<
    {
      id: string;
      title: string;
      url: string;
      thumbnail: string | null;
      duration: number | null;
      channel: string;
    }[]
  > => ipcRenderer.invoke("search:youtube", query, page),

  listSubtitles: (
    url: string
  ): Promise<
    {
      id: string;
      name: string;
      ext: string;
      isAutoGenerated: boolean;
    }[]
  > => ipcRenderer.invoke("subtitles:list", url),

  checkForUpdates: (): Promise<{ updateAvailable: boolean; version?: string }> =>
    ipcRenderer.invoke("app:checkUpdate"),

  downloadUpdate: (): Promise<void> => ipcRenderer.invoke("app:downloadUpdate"),

  installUpdate: (): Promise<void> => ipcRenderer.invoke("app:installUpdate"),

  quitApp: (): Promise<void> => ipcRenderer.invoke("app:quit"),

  checkDiskSpace: (path: string): Promise<{ available: number; total: number }> =>
    ipcRenderer.invoke("system:checkDiskSpace", path),

  getLogsHistory: (): Promise<{ level: string; message: string; timestamp: number }[]> =>
    ipcRenderer.invoke("logs:history"),

  getMediaUrl: (
    filePath: string
  ): Promise<{ url: string | null; resolvedPath: string; exists: boolean }> =>
    ipcRenderer.invoke("media:getUrl", filePath),

  // --- Event listeners (return cleanup) ---
  onClipboardUrlDetected: (cb: (url: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, url: string) => cb(url);
    ipcRenderer.on("clipboard:url-detected", handler);
    return () => ipcRenderer.removeListener("clipboard:url-detected", handler);
  },

  onJobQueued: (cb: (job: Job) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, job: Job) => cb(job);
    ipcRenderer.on("job:queued", handler);
    return () => ipcRenderer.removeListener("job:queued", handler);
  },

  onJobStarted: (cb: (job: Job) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, job: Job) => cb(job);
    ipcRenderer.on("job:started", handler);
    return () => ipcRenderer.removeListener("job:started", handler);
  },

  onJobProgress: (cb: (jobId: string, progress: YtDlpProgress) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, jobId: string, progress: YtDlpProgress) =>
      cb(jobId, progress);
    ipcRenderer.on("job:progress", handler);
    return () => ipcRenderer.removeListener("job:progress", handler);
  },

  onJobCompleted: (cb: (job: Job) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, job: Job) => cb(job);
    ipcRenderer.on("job:completed", handler);
    return () => ipcRenderer.removeListener("job:completed", handler);
  },

  onJobFailed: (
    cb: (job: Job, err: { message: string; stderr?: string }) => void
  ): (() => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      job: Job,
      err: { message: string; stderr?: string }
    ) => cb(job, err);
    ipcRenderer.on("job:failed", handler);
    return () => ipcRenderer.removeListener("job:failed", handler);
  },

  onJobCancelled: (cb: (job: Job) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, job: Job) => cb(job);
    ipcRenderer.on("job:cancelled", handler);
    return () => ipcRenderer.removeListener("job:cancelled", handler);
  },

  onJobPaused: (cb: (job: Job) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, job: Job) => cb(job);
    ipcRenderer.on("job:paused", handler);
    return () => ipcRenderer.removeListener("job:paused", handler);
  },

  onUpdateAvailable: (cb: (info: { version: string }) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info);
    ipcRenderer.on("update:available", handler);
    return () => ipcRenderer.removeListener("update:available", handler);
  },

  onUpdateNotAvailable: (cb: (info: { version: string }) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info);
    ipcRenderer.on("update:not-available", handler);
    return () => ipcRenderer.removeListener("update:not-available", handler);
  },

  onUpdateDownloaded: (cb: (info: { version: string }) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info);
    ipcRenderer.on("update:downloaded", handler);
    return () => ipcRenderer.removeListener("update:downloaded", handler);
  },

  onUpdateProgress: (
    cb: (info: { percent: number; transferred: number; total: number }) => void
  ): (() => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      info: { percent: number; transferred: number; total: number }
    ) => cb(info);
    ipcRenderer.on("update:progress", handler);
    return () => ipcRenderer.removeListener("update:progress", handler);
  },

  onUpdateError: (cb: (error: { message: string }) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, error: { message: string }) => cb(error);
    ipcRenderer.on("update:error", handler);
    return () => ipcRenderer.removeListener("update:error", handler);
  },

  onUpdateChecking: (cb: () => void): (() => void) => {
    const handler = () => cb();
    ipcRenderer.on("update:checking", handler);
    return () => ipcRenderer.removeListener("update:checking", handler);
  },

  onOpenQuickActions: (cb: () => void): (() => void) => {
    const handler = () => cb();
    ipcRenderer.on("open-quick-actions", handler);
    return () => ipcRenderer.removeListener("open-quick-actions", handler);
  },

  onMediaPlayPause: (cb: () => void): (() => void) => {
    const handler = () => cb();
    ipcRenderer.on("media:play-pause", handler);
    return () => ipcRenderer.removeListener("media:play-pause", handler);
  },

  onMediaNextTrack: (cb: () => void): (() => void) => {
    const handler = () => cb();
    ipcRenderer.on("media:next-track", handler);
    return () => ipcRenderer.removeListener("media:next-track", handler);
  },

  onMediaPreviousTrack: (cb: () => void): (() => void) => {
    const handler = () => cb();
    ipcRenderer.on("media:prev-track", handler);
    return () => ipcRenderer.removeListener("media:prev-track", handler);
  },

  minimizeWindow: (): void => {
    void ipcRenderer.invoke("window:minimize");
  },
  maximizeWindow: (): void => {
    void ipcRenderer.invoke("window:maximize");
  },
  closeWindow: (): void => {
    void ipcRenderer.invoke("window:close");
  },

  onWindowMaximize: (cb: () => void): (() => void) => {
    const handler = () => cb();
    ipcRenderer.on("window:maximized", handler);
    return () => ipcRenderer.removeListener("window:maximized", handler);
  },

  onWindowUnmaximize: (cb: () => void): (() => void) => {
    const handler = () => cb();
    ipcRenderer.on("window:unmaximized", handler);
    return () => ipcRenderer.removeListener("window:unmaximized", handler);
  }
};

export type VaultApi = typeof vaultApi;

try {
  contextBridge.exposeInMainWorld("electron", electronAPI);
  contextBridge.exposeInMainWorld("api", vaultApi);
} catch (error) {
  console.error("Failed to expose APIs to renderer:", error);
}
