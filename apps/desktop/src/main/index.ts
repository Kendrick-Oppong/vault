import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, globalShortcut } from "electron";
import { join } from "node:path";
import fs, { statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import icon from "../../resources/icon.png?asset";
import { createYtDlpManager, type YtDlpManager } from "./ytdlp-manager";
import { probePlaylistPage } from "./ytdlp-manager";
import { createWorkerPool, type WorkerPool } from "./worker-pool";
import { initDb, type VaultDb } from "./db";
import { JobInput } from "@vault/types";
import { validateMediaUrl, validateOutputTemplate, validateFormatSelector } from "./validators";
import {
  checkDependencies,
  getDependencyErrorMessage,
  downloadDependencies,
  updateYtDlp,
  updateFfmpeg
} from "./dependencies";
import * as cookies from "./cookies";
import { logger } from "./logger";
import { notifyDownloadComplete } from "./notifications";
import { startMediaServer, stopMediaServer, buildMediaUrl } from "./media-server";
import { resolveActualOutputPath } from "./resolve-output";
import { repairHistoryPaths } from "./repair-history";
import {
  startClipboardMonitor,
  stopClipboardMonitor,
  setClipboardMonitorEnabled
} from "./clipboard-monitor";

app.commandLine.appendSwitch("disable-blink-features", "AutomationControlled");

const vaultApp = app as typeof app & { isQuitting: boolean };
vaultApp.isQuitting = false;

const execFileAsync = promisify(execFile);

let mainWindow: BrowserWindow;
let pool: WorkerPool;
let db: VaultDb;
let ytdlp: YtDlpManager;
let tray: Tray | null = null;
let minimizeToTraySetting = false;

/* ── Persisted main-process settings ── */
interface MainSettings {
  autoUpdateApp: boolean;
  notifications: boolean;
  historyRepairedV1: boolean;
  clipboardDetection: boolean;
}

const mainSettingsPath = join(app.getPath("userData"), "main-settings.json");

function loadMainSettings(): MainSettings {
  try {
    if (existsSync(mainSettingsPath)) {
      const data = JSON.parse(readFileSync(mainSettingsPath, "utf-8"));
      return {
        autoUpdateApp: typeof data.autoUpdateApp === "boolean" ? data.autoUpdateApp : true,
        notifications: typeof data.notifications === "boolean" ? data.notifications : true,
        historyRepairedV1:
          typeof data.historyRepairedV1 === "boolean" ? data.historyRepairedV1 : false,
        clipboardDetection:
          typeof data.clipboardDetection === "boolean" ? data.clipboardDetection : true
      };
    }
  } catch {
    /* ignore */
  }
  return {
    autoUpdateApp: true,
    notifications: true,
    historyRepairedV1: false,
    clipboardDetection: true
  };
}

function saveMainSettings(settings: MainSettings): void {
  try {
    writeFileSync(mainSettingsPath, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

const mainSettings = loadMainSettings();
let autoUpdaterInstance: import("electron-updater").AppUpdater | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

function resolveBinaryPaths(): { binaryPath: string; ffmpegPath: string } {
  let base: string;
  if (app.isPackaged) {
    base = join(app.getPath("userData"), "bin");
  } else {
    base = join(__dirname, "..", "..", "bin", process.platform);
  }
  const ext = process.platform === "win32" ? ".exe" : "";
  return {
    binaryPath: join(base, `yt-dlp${ext}`),
    ffmpegPath: join(base, `ffmpeg${ext}`)
  };
}

function sendToRenderer(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    title: "Vault",
    icon,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true
    }
  });

  mainWindow.on("ready-to-show", () => mainWindow.show());
  mainWindow.on("maximize", () => sendToRenderer("window:maximized"));
  mainWindow.on("unmaximize", () => sendToRenderer("window:unmaximized"));

  mainWindow.on("close", (event) => {
    if (!vaultApp.isQuitting && minimizeToTraySetting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function forwardPoolEventsToRenderer(): void {
  pool.on("job:queued", (job) => sendToRenderer("job:queued", job));
  pool.on("job:started", (job) => sendToRenderer("job:started", job));
  pool.on("job:progress", (jobId, progress) => sendToRenderer("job:progress", jobId, progress));

  pool.on("job:completed", (job) => {
    sendToRenderer("job:completed", job);
    notifyDownloadComplete(job, mainSettings.notifications);
    try {
      let file_size: number | null = null;
      const actualPath: string | null = job.meta?.expectedPath
        ? resolveActualOutputPath(job.meta.expectedPath, job.meta?.mediaType, {
            preferExisting: true
          })
        : null;

      logger.info(
        `[job:completed] job=${job.id} expectedPath="${job.meta?.expectedPath}" resolvedPath="${actualPath}" exists=${actualPath ? existsSync(actualPath) : false}`
      );

      if (actualPath && existsSync(actualPath)) {
        try {
          file_size = statSync(actualPath).size;
        } catch {
          /* ignore */
        }
      }

      db.addHistoryEntry({
        job_id: job.id,
        video_id: job.meta?.videoId || null,
        title: job.meta?.title || null,
        channel: job.meta?.channel || null,
        url: job.url,
        file_path: actualPath,
        thumbnail_url: job.meta?.thumbnailUrl || null,
        status: job.status,
        media_type: job.meta?.mediaType || null,
        quality: job.meta?.quality || null,
        file_size,
        created_at: job.createdAt,
        completed_at: Date.now()
      });
    } catch (err) {
      logger.error("Failed to save completed job to history:", err);
    }
  });

  pool.on("job:failed", (job, err) => {
    sendToRenderer("job:failed", job, err);
    try {
      db.addHistoryEntry({
        job_id: job.id,
        video_id: job.meta?.videoId || null,
        title: job.meta?.title || null,
        channel: job.meta?.channel || null,
        url: job.url,
        file_path: job.meta?.expectedPath || null,
        thumbnail_url: job.meta?.thumbnailUrl || null,
        status: job.status,
        media_type: job.meta?.mediaType || null,
        quality: job.meta?.quality || null,
        file_size: null,
        created_at: job.createdAt,
        completed_at: Date.now()
      });
    } catch (e) {
      logger.error("Failed to save failed job to history:", e);
    }
  });

  pool.on("job:cancelled", (job) => sendToRenderer("job:cancelled", job));
  pool.on("job:paused", (job) => sendToRenderer("job:paused", job));
}

function registerIpcHandlers(): void {
  ipcMain.handle("formats:probe", async (_e, url: string, playlistLimit?: number) => {
    const cached = db.getCachedFormats(url);
    if (cached && !playlistLimit) return cached;
    const cookieFile = cookies.getCookiesPath();
    const probeExtras = cookieFile ? { cookiesFile: cookieFile, playlistLimit } : { playlistLimit };
    const formats = await ytdlp.probeFormats(url, probeExtras);
    if (!playlistLimit) db.setCachedFormats(url, formats);
    return formats;
  });

  ipcMain.handle("formats:playlistPage", async (_e, url: string, start: number, end: number) => {
    const cookieFile = cookies.getCookiesPath();
    const probeExtras = cookieFile ? { cookiesFile: cookieFile } : {};
    const binaryPaths = {
      binaryPath: ytdlp.binaryPath,
      ffmpegPath: ytdlp.ffmpegPath,
      userDataPath: ytdlp.userDataPath
    };
    return await probePlaylistPage(binaryPaths, url, start, end, probeExtras);
  });

  ipcMain.handle("queue:add", (_e, jobInput: JobInput) => {
    logger.info("Queueing download:", jobInput.url);
    const urlValidation = validateMediaUrl(jobInput.url);
    if (!urlValidation.valid) throw new Error(`Invalid URL: ${urlValidation.error}`);
    const templateValidation = validateOutputTemplate(jobInput.outputTemplate);
    if (!templateValidation.valid)
      throw new Error(`Invalid output template: ${templateValidation.error}`);
    const formatValidation = validateFormatSelector(jobInput.formatSelector);
    if (!formatValidation.valid)
      throw new Error(`Invalid format selector: ${formatValidation.error}`);

    const cookieFile = cookies.getCookiesPath();
    if (cookieFile) {
      jobInput = {
        ...jobInput,
        extra: { ...jobInput.extra, cookiesFile: cookieFile, cookiesFromBrowser: undefined }
      };
    }
    return pool.enqueue(jobInput);
  });

  ipcMain.handle("queue:cancel", (_e, jobId: string) => pool.cancel(jobId));
  ipcMain.handle("queue:pause", (_e, jobId: string) => pool.pause(jobId));
  ipcMain.handle("queue:pauseAll", () => pool.pauseAll());
  ipcMain.handle("queue:resume", (_e, jobId: string) => pool.resume(jobId));
  ipcMain.handle("queue:retry", (_e, jobId: string) => pool.retry(jobId));
  ipcMain.handle("queue:getJobs", () => pool.getJobs());
  ipcMain.handle("queue:setConcurrency", (_e, n: number) => {
    pool.setMaxConcurrent(n);
    return true;
  });

  ipcMain.handle("history:list", (_e, limit?: number, offset?: number) =>
    db.listHistory(limit, offset)
  );
  ipcMain.handle("history:delete", (_e, jobId: string) => {
    db.deleteHistory(jobId);
    return true;
  });
  ipcMain.handle("history:bulkDelete", (_e, jobIds: string[]) => {
    db.bulkDeleteHistory(jobIds);
    return true;
  });

  ipcMain.handle("fs:reveal", (_e, filePath: string) => {
    const resolved = resolveActualOutputPath(filePath, undefined, { preferExisting: true });
    logger.info(
      `[fs:reveal] input="${filePath}" resolved="${resolved}" exists=${existsSync(resolved)}`
    );
    shell.showItemInFolder(resolved);
  });

  ipcMain.handle("fs:open", async (_e, filePath: string) => {
    const resolved = resolveActualOutputPath(filePath, undefined, { preferExisting: true });
    logger.info(
      `[fs:open] input="${filePath}" resolved="${resolved}" exists=${existsSync(resolved)}`
    );
    const error = await shell.openPath(resolved);
    if (error) logger.warn(`[fs:open] shell.openPath error: "${error}"`);
    return error || null;
  });

  ipcMain.handle("fs:fileExists", async (_e, filePath: string) => {
    const resolved = resolveActualOutputPath(filePath, undefined, { preferExisting: true });
    const exists = fs.existsSync(resolved);
    logger.debug(`[fs:fileExists] input="${filePath}" resolved="${resolved}" exists=${exists}`);
    return exists;
  });

  ipcMain.handle("fs:scanDir", async (_e, dirPath: string) => {
    try {
      if (!fs.existsSync(dirPath)) return [];
      return fs
        .readdirSync(dirPath, { withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => e.name);
    } catch {
      return [];
    }
  });

  ipcMain.handle(
    "dialog:openFile",
    async (_e, opts?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: opts?.title || "Select file",
        properties: ["openFile"],
        filters: opts?.filters || [{ name: "All Files", extensions: ["*"] }]
      });
      return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
    }
  );

  ipcMain.handle("dialog:openFolder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select download folder",
      properties: ["openDirectory", "createDirectory"]
    });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  ipcMain.handle("cookies:info", (_e, browserSetting: string | null) =>
    cookies.getCookieInfo(browserSetting)
  );
  ipcMain.handle("cookies:set", async (_e, browserSetting: string) => {
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    return cookies.refreshCookies(browserSetting, binaryPath, ffmpegPath);
  });
  ipcMain.handle("cookies:refresh", async (_e, browserSetting: string | null) => {
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    return cookies.refreshCookies(browserSetting, binaryPath, ffmpegPath);
  });
  ipcMain.handle("cookies:clear", (_e, browserSetting: string | null) => {
    cookies.clearCookies();
    return cookies.getCookieInfo(browserSetting);
  });

  ipcMain.handle("cache:clearFormats", (_e, url?: string) => db.clearFormatCache(url));
  ipcMain.handle("cache:clearDownloadArchive", async (_e, downloadPath: string) => {
    const archivePath = join(downloadPath, "archive.txt");
    if (existsSync(archivePath)) {
      try {
        fs.unlinkSync(archivePath);
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
    return { success: true };
  });

  ipcMain.handle("app:info", async () => {
    const { binaryPath } = resolveBinaryPaths();
    let ytDlpVersion = "unknown";
    try {
      const { stdout } = await execFileAsync(binaryPath, ["--version"]);
      ytDlpVersion = stdout.trim();
    } catch {
      /* ignore */
    }
    return {
      appVersion: app.getVersion(),
      ytDlpVersion,
      defaultDownloadPath: app.getPath("videos")
    };
  });

  ipcMain.handle("dependencies:check", async () => {
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    const status = await checkDependencies(binaryPath, ffmpegPath);
    return {
      ready: status.allReady,
      ytDlp: status.ytDlp,
      ffmpeg: status.ffmpeg,
      errors: status.errors,
      errorMessage: status.allReady ? null : getDependencyErrorMessage(status)
    };
  });

  ipcMain.handle("dependencies:download", async () => {
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    const destDir = join(binaryPath, "..");
    await downloadDependencies(destDir, (progress) =>
      sendToRenderer("dependency:download:progress", progress)
    );
    const status = await checkDependencies(binaryPath, ffmpegPath);
    if (status.allReady) {
      const { binaryPath: newPath, ffmpegPath: newFfmpegPath } = resolveBinaryPaths();
      ytdlp = createYtDlpManager({
        binaryPath: newPath,
        ffmpegPath: newFfmpegPath,
        userDataPath: app.getPath("userData")
      });
      pool = createWorkerPool({ ytdlp, maxConcurrent: 3 });
      forwardPoolEventsToRenderer();
    }
    return {
      ready: status.allReady,
      ytDlp: status.ytDlp,
      ffmpeg: status.ffmpeg,
      errors: status.errors,
      errorMessage: status.allReady ? null : getDependencyErrorMessage(status)
    };
  });

  ipcMain.handle("dependencies:update", async (_e, binary: "ytdlp" | "ffmpeg" | "all") => {
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    const destDir = join(binaryPath, "..");
    try {
      if (binary === "ytdlp" || binary === "all") {
        await updateYtDlp(destDir, (progress) =>
          sendToRenderer("dependency:download:progress", progress)
        );
      }
      if (binary === "ffmpeg" || binary === "all") {
        await updateFfmpeg(destDir, (progress) =>
          sendToRenderer("dependency:download:progress", progress)
        );
      }
      const status = await checkDependencies(binaryPath, ffmpegPath);
      if (status.allReady) {
        const { binaryPath: newPath, ffmpegPath: newFfmpegPath } = resolveBinaryPaths();
        ytdlp = createYtDlpManager({
          binaryPath: newPath,
          ffmpegPath: newFfmpegPath,
          userDataPath: app.getPath("userData")
        });
        pool = createWorkerPool({ ytdlp, maxConcurrent: 3 });
        forwardPoolEventsToRenderer();
      }
      return {
        ready: status.allReady,
        ytDlp: status.ytDlp,
        ffmpeg: status.ffmpeg,
        errors: status.errors,
        errorMessage: status.allReady ? null : getDependencyErrorMessage(status)
      };
    } catch (err) {
      logger.error("Binary update failed:", err);
      throw err;
    }
  });

  ipcMain.handle("settings:getAutoUpdateApp", async () => mainSettings.autoUpdateApp);
  ipcMain.handle("settings:setAutoUpdateApp", async (_e, value: boolean) => {
    mainSettings.autoUpdateApp = value;
    saveMainSettings(mainSettings);
    if (autoUpdaterInstance) autoUpdaterInstance.autoDownload = value;
    logger.info("Auto-update app setting updated:", value);
    return mainSettings.autoUpdateApp;
  });

  ipcMain.handle("settings:getNotifications", async () => mainSettings.notifications);
  ipcMain.handle("settings:setNotifications", async (_e, value: boolean) => {
    mainSettings.notifications = value;
    saveMainSettings(mainSettings);
    logger.info("Notifications setting updated:", value);
    return mainSettings.notifications;
  });

  ipcMain.handle("search:youtube", async (_e, query: string, page: number = 0) => {
    const binaryPath = ytdlp.binaryPath;
    const count = 20;
    const safePage = Math.max(0, page);
    const requestedCount = count * (safePage + 1);
    const searchQuery = `ytsearch${requestedCount}:${query}`;
    const cookieFile = cookies.getCookiesPath();
    const args = ["--dump-json", "--flat-playlist", "--no-playlist"];
    if (cookieFile) args.push("--cookies", cookieFile);
    args.push(searchQuery);
    try {
      const { stdout } = await execFileAsync(binaryPath, args, { maxBuffer: 10 * 1024 * 1024 });
      const lines = stdout.split("\n").filter(Boolean);
      const results = lines
        .map((line) => {
          try {
            const item = JSON.parse(line);
            return {
              id: item.id || "",
              title: item.title || "Unknown",
              url: item.url || item.webpage_url || `https://youtube.com/watch?v=${item.id}`,
              thumbnail:
                (item.thumbnails && item.thumbnails[item.thumbnails.length - 1]?.url) ||
                item.thumbnail ||
                null,
              duration: item.duration || null,
              channel: item.channel || item.uploader || "Unknown"
            };
          } catch {
            return null;
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      return results.slice(safePage * count, (safePage + 1) * count);
    } catch (err: unknown) {
      throw new Error(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  ipcMain.handle("subtitles:list", async (_e, url: string) => {
    const binaryPath = ytdlp.binaryPath;
    const cookieFile = cookies.getCookiesPath();
    const args = ["--dump-json", "--no-playlist"];
    if (cookieFile) args.push("--cookies", cookieFile);
    args.push(url);
    try {
      const { stdout } = await execFileAsync(binaryPath, args, { maxBuffer: 5 * 1024 * 1024 });
      const info = JSON.parse(stdout.trim().split("\n")[0]);
      const tracks: { id: string; name: string; ext: string; isAutoGenerated: boolean }[] = [];
      const subtitles: Record<string, { name?: string; ext?: string }[]> = info.subtitles || {};
      const autoCaptions: Record<string, { name?: string; ext?: string }[]> =
        info.automatic_captions || {};

      for (const [langCode, formats] of Object.entries(subtitles)) {
        const first = formats?.[0];
        tracks.push({
          id: langCode,
          name: first?.name || langCode,
          ext: first?.ext || "vtt",
          isAutoGenerated: false
        });
      }
      for (const [langCode, formats] of Object.entries(autoCaptions)) {
        if (!subtitles[langCode]) {
          const first = formats?.[0];
          tracks.push({
            id: langCode,
            name: (first?.name || langCode) + " (auto)",
            ext: first?.ext || "vtt",
            isAutoGenerated: true
          });
        }
      }
      return tracks;
    } catch (err: unknown) {
      throw new Error(
        `Failed to list subtitles: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  });

  ipcMain.handle("app:checkUpdate", async () => {
    logger.debug("IPC: app:checkUpdate");
    try {
      const updater = autoUpdaterInstance;
      if (!updater) return { updateAvailable: false };

      return await new Promise<{ updateAvailable: boolean; version?: string }>((resolve) => {
        const timeout = setTimeout(() => resolve({ updateAvailable: false }), 15000);

        const onAvailable = (info: { version: string }) => {
          clearTimeout(timeout);
          cleanup();
          resolve({ updateAvailable: true, version: info.version });
        };
        const onNotAvailableOrError = () => {
          clearTimeout(timeout);
          cleanup();
          resolve({ updateAvailable: false });
        };

        const cleanup = () => {
          updater.removeListener("update-available", onAvailable);
          updater.removeListener("update-not-available", onNotAvailableOrError);
          updater.removeListener("error", onNotAvailableOrError);
        };

        updater.once("update-available", onAvailable);
        updater.once("update-not-available", onNotAvailableOrError);
        updater.once("error", onNotAvailableOrError);

        updater.checkForUpdates().catch(() => {
          clearTimeout(timeout);
          cleanup();
          resolve({ updateAvailable: false });
        });
      });
    } catch {
      return { updateAvailable: false };
    }
  });

  ipcMain.handle("app:downloadUpdate", async () => {
    logger.debug("IPC: app:downloadUpdate");
    try {
      await autoUpdaterInstance?.downloadUpdate();
    } catch (err) {
      logger.error("Download update failed:", err);
      throw err;
    }
  });

  ipcMain.handle("app:installUpdate", async () => {
    logger.debug("IPC: app:installUpdate");
    try {
      autoUpdaterInstance?.quitAndInstall(false, true);
    } catch (err) {
      logger.error("Install update failed:", err);
      throw err;
    }
  });

  ipcMain.handle("system:checkDiskSpace", async (_e, path: string) => {
    try {
      if (!path || path === "__unset__") return { available: 0, total: 0 };
      const stats = await fs.promises.statfs(path);
      return { available: stats.bavail * stats.bsize, total: stats.blocks * stats.bsize };
    } catch (err) {
      logger.error("Failed to check disk space:", err);
      return { available: 0, total: 0 };
    }
  });

  ipcMain.handle("app:quit", () => {
    vaultApp.isQuitting = true;
    app.quit();
  });

  ipcMain.handle("logs:history", () => logger.history());

  ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  ipcMain.handle("window:maximize", () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle("window:close", () => mainWindow?.close());

  ipcMain.handle("media:getUrl", (_e, filePath: string) => {
    logger.info(`[media:getUrl] input="${filePath}"`);
    const resolved = resolveActualOutputPath(filePath, undefined, { preferExisting: true });

    if (!existsSync(resolved)) {
      logger.warn(`[media:getUrl] Resolved file NOT found: "${resolved}"`);
      return { url: null, resolvedPath: resolved, exists: false };
    }

    const url = buildMediaUrl(resolved);
    logger.info(`[media:getUrl] Resolved OK: "${resolved}" → ${url}`);
    return { url, resolvedPath: resolved, exists: true };
  });

  ipcMain.on("settings:sync", (_e, settings) => {
    if (typeof settings.minimizeToTray === "boolean")
      minimizeToTraySetting = settings.minimizeToTray;
    if (typeof settings.clipboardDetection === "boolean") {
      setClipboardMonitorEnabled(settings.clipboardDetection);
      mainSettings.clipboardDetection = settings.clipboardDetection;
      saveMainSettings(mainSettings);
    }
  });
}

/* ── Auto-updater ── */
async function setupAutoUpdater() {
  if (!app.isPackaged) {
    logger.info("Dev mode — auto-updates disabled (only active in packaged builds)");
    return;
  }

  try {
    const { autoUpdater } = await import("electron-updater");
    autoUpdaterInstance = autoUpdater;

    autoUpdater.autoDownload = mainSettings.autoUpdateApp;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowDowngrade = false;

    autoUpdater.on("checking-for-update", () => {
      logger.info("Checking for app updates…");
      sendToRenderer("update:checking");
    });

    autoUpdater.on("update-available", (info: { version: string }) => {
      logger.info("App update available:", info.version);
      sendToRenderer("update:available", info);
    });

    autoUpdater.on("update-not-available", (info: { version: string }) => {
      logger.info("App is up to date:", info.version);
      sendToRenderer("update:not-available", info);
    });

    autoUpdater.on("update-downloaded", (info: { version: string }) => {
      logger.info("App update downloaded:", info.version);
      sendToRenderer("update:downloaded", info);
    });

    autoUpdater.on(
      "download-progress",
      (info: { percent: number; transferred: number; total: number }) => {
        logger.debug("Download progress:", info.percent);
        sendToRenderer("update:progress", info);
      }
    );

    autoUpdater.on("error", (err: Error) => {
      logger.warn("App update error:", err.message);
      sendToRenderer("update:error", { message: err.message });
    });

    setTimeout(() => {
      if (mainSettings.autoUpdateApp) {
        autoUpdater
          .checkForUpdates()
          .catch((err) => logger.warn("Launch update check failed:", err?.message ?? err));
      }
    }, 4000);

    updateCheckInterval = setInterval(() => {
      if (mainSettings.autoUpdateApp) {
        logger.debug("Running periodic update check");
        autoUpdater
          .checkForUpdates()
          .catch((err) => logger.warn("Periodic update check failed:", err?.message ?? err));
      }
    }, UPDATE_CHECK_INTERVAL_MS);
  } catch (err) {
    logger.warn(
      "electron-updater not configured — skipping auto-updates:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

/* ── App lifecycle ── */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  await startMediaServer();

  electronApp.setAppUserModelId("com.vault.app");

  app.on("browser-window-created", (_, window) => optimizer.watchWindowShortcuts(window));

  const { binaryPath, ffmpegPath } = resolveBinaryPaths();
  logger.info("Vault started, version", app.getVersion());

  const depStatus = await checkDependencies(binaryPath, ffmpegPath);
  if (depStatus.allReady) {
    logger.info("All dependencies ready");
  } else {
    logger.error("Dependencies missing:", depStatus.errors);
  }

  ytdlp = createYtDlpManager({ binaryPath, ffmpegPath, userDataPath: app.getPath("userData") });
  pool = createWorkerPool({ ytdlp, maxConcurrent: 3 });
  db = initDb(join(app.getPath("userData"), "library.db"));

  if (!mainSettings.historyRepairedV1) {
    try {
      const result = repairHistoryPaths(db.raw);
      logger.info("History path repair complete:", result);
      mainSettings.historyRepairedV1 = true;
      saveMainSettings(mainSettings);
    } catch (err) {
      logger.error("History path repair failed (will retry next launch):", err);
    }
  }

  registerIpcHandlers();
  createWindow();
  forwardPoolEventsToRenderer();

  // Start clipboard monitor after window is ready
  startClipboardMonitor(sendToRenderer);
  setClipboardMonitorEnabled(mainSettings.clipboardDetection);

  tray = new Tray(icon);
  tray.setToolTip("Vault");
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show Vault", click: () => mainWindow?.show() },
    {
      label: "Quit",
      click: () => {
        vaultApp.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      if (mainWindow.isFocused()) mainWindow.hide();
      else mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });

  await setupAutoUpdater();

  globalShortcut.register("MediaPlayPause", () => {
    sendToRenderer("media:play-pause");
  });
  globalShortcut.register("MediaNextTrack", () => {
    sendToRenderer("media:next-track");
  });
  globalShortcut.register("MediaPreviousTrack", () => {
    sendToRenderer("media:prev-track");
  });
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  vaultApp.isQuitting = true;
  if (updateCheckInterval) clearInterval(updateCheckInterval);
  if (db?.raw) db.raw.close();
  globalShortcut.unregisterAll();
  stopMediaServer();
  stopClipboardMonitor();
});
