import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import type { JobInput, Job, YtDlpProgress, HistoryEntry } from "@vault/types";

// Extend globalThis for renderer to access api directly
declare global {
  var api: VaultApi;
}

const vaultApi = {
  // --- Invoke methods ---
  probeFormats: (url: string): Promise<Record<string, unknown>[]> =>
    ipcRenderer.invoke("formats:probe", url),

  queueDownload: (jobInput: JobInput): Promise<string> => ipcRenderer.invoke("queue:add", jobInput),

  cancelDownload: (jobId: string): Promise<boolean> => ipcRenderer.invoke("queue:cancel", jobId),

  pauseDownload: (jobId: string): Promise<boolean> => ipcRenderer.invoke("queue:pause", jobId),

  resumeDownload: (jobId: string): Promise<string | null> =>
    ipcRenderer.invoke("queue:resume", jobId),

  retryDownload: (jobId: string): Promise<string | null> =>
    ipcRenderer.invoke("queue:retry", jobId),

  setConcurrency: (n: number): Promise<boolean> => ipcRenderer.invoke("queue:setConcurrency", n),

  getHistory: (limit?: number, offset?: number): Promise<HistoryEntry[]> =>
    ipcRenderer.invoke("history:list", limit, offset),

  deleteHistory: (jobId: string): Promise<boolean> => ipcRenderer.invoke("history:delete", jobId),

  openInFolder: (filePath: string): Promise<void> => ipcRenderer.invoke("fs:reveal", filePath),

  openFile: (filePath: string): Promise<string | null> => ipcRenderer.invoke("fs:open", filePath),

  openFileDialog: (opts?: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null> => ipcRenderer.invoke("dialog:openFile", opts),

  youtubeLogin: (): Promise<{ success: boolean; filePath: string | null; error?: string }> =>
    ipcRenderer.invoke("auth:youtubeLogin"),

  checkYoutubeCookies: (): Promise<boolean> => ipcRenderer.invoke("auth:checkCookies"),

  clearYoutubeCookies: (): Promise<boolean> => ipcRenderer.invoke("auth:clearCookies"),

  getYoutubeCookiesPath: (): Promise<string | null> => ipcRenderer.invoke("auth:getCookiesPath"),

  saveCookies: (cookiesText: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("cookies:save", cookiesText),

  importCookies: (
    jsonFilePath: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke("cookies:import", jsonFilePath),

  clearFormatCache: (url?: string): Promise<void> => ipcRenderer.invoke("cache:clearFormats", url),

  getAppInfo: (): Promise<{
    appVersion: string;
    ytDlpVersion: string;
    defaultDownloadPath: string;
  }> => ipcRenderer.invoke("app:info"),

  // --- Event listeners (return cleanup) ---
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
  }
};

export type VaultApi = typeof vaultApi;

// Context isolation is always enabled in production Electron apps
try {
  contextBridge.exposeInMainWorld("electron", electronAPI);
  contextBridge.exposeInMainWorld("api", vaultApi);
} catch (error) {
  console.error("Failed to expose APIs to renderer:", error);
}
