import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "node:path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { statSync } from "node:fs";
import icon from "../../resources/icon.png?asset";
import { createYtDlpManager, type YtDlpManager } from "./ytdlp-manager";
import { probePlaylistPage } from "./ytdlp-manager";
import { createWorkerPool, type WorkerPool } from "./worker-pool";
import { initDb, type VaultDb } from "./db";
import { JobInput } from "@vault/types";
import { validateYouTubeUrl, validateOutputTemplate, validateFormatSelector } from "./validators";
import { checkDependencies, getDependencyErrorMessage, downloadDependencies } from "./dependencies";
import * as cookies from "./cookies";
import { logger } from "./logger";

// Must be set before app.whenReady() — hides Electron automation signals from Google
app.commandLine.appendSwitch("disable-blink-features", "AutomationControlled");

const vaultApp = app as typeof app & { isQuitting: boolean };

// Global flag so tray can allow a real quit
vaultApp.isQuitting = false;

const execFileAsync = promisify(execFile);

let mainWindow: BrowserWindow;
let pool: WorkerPool;
let db: VaultDb;
let ytdlp: YtDlpManager;

function resolveBinaryPaths(): { binaryPath: string; ffmpegPath: string; pluginPath: string } {
  let base: string;
  if (app.isPackaged) {
    base = join(process.resourcesPath, "bin");
  } else {
    // In dev, we expect binaries at project root/bin/<platform>
    // __dirname is <project>/out/main, so we go up two levels to project root
    base = join(__dirname, "..", "..", "bin", process.platform);
  }

  const ext = process.platform === "win32" ? ".exe" : "";
  return {
    binaryPath: join(base, `yt-dlp${ext}`),
    ffmpegPath: join(base, `ffmpeg${ext}`),
    pluginPath: join(base, "yt-dlp-plugins")
  };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true
    }
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function forwardPoolEventsToRenderer(): void {
  pool.on("job:queued", (job) => mainWindow?.webContents.send("job:queued", job));
  pool.on("job:started", (job) => mainWindow?.webContents.send("job:started", job));
  pool.on("job:progress", (jobId, progress) =>
    mainWindow?.webContents.send("job:progress", jobId, progress)
  );
  pool.on("job:completed", (job) => {
    mainWindow?.webContents.send("job:completed", job);
    try {
      let file_size: number | null = null;
      if (job.meta?.expectedPath) {
        try {
          file_size = statSync(job.meta.expectedPath).size;
        } catch {
          // File might not exist
        }
      }
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
        file_size,
        created_at: job.createdAt,
        completed_at: Date.now()
      });
    } catch (err) {
      logger.error("Failed to save completed job to history:", err);
    }
  });

  pool.on("job:failed", (job, err) => {
    mainWindow?.webContents.send("job:failed", job, err);
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
  pool.on("job:cancelled", (job) => mainWindow?.webContents.send("job:cancelled", job));
  pool.on("job:paused", (job) => mainWindow?.webContents.send("job:paused", job));

  // Forward window state changes to renderer (for custom titlebar)
  mainWindow.on("maximize", () => mainWindow?.webContents.send("window:maximized"));
  mainWindow.on("unmaximize", () => mainWindow?.webContents.send("window:unmaximized"));
}

function registerIpcHandlers(): void {
  ipcMain.handle("formats:probe", async (_e, url: string, playlistLimit?: number) => {
    const cached = db.getCachedFormats(url);
    if (cached && !playlistLimit) return cached; // Only use cache if not requesting specific limit

    // Use cached cookies if available
    const cookieFile = cookies.getCookiesPath();
    const probeExtras = cookieFile ? { cookiesFile: cookieFile, playlistLimit } : { playlistLimit };

    const formats = await ytdlp.probeFormats(url, probeExtras);
    if (!playlistLimit) db.setCachedFormats(url, formats); // Only cache full results
    return formats;
  });

  ipcMain.handle("formats:playlistPage", async (_e, url: string, start: number, end: number) => {
    // Use cached cookies if available
    const cookieFile = cookies.getCookiesPath();
    const probeExtras = cookieFile ? { cookiesFile: cookieFile } : {};

    const binaryPaths = { ...resolveBinaryPaths(), userDataPath: app.getPath("userData") };
    return await probePlaylistPage(binaryPaths, url, start, end, probeExtras);
  });

  // Intercept downloads: validate URL and format, inject cookies if available
  ipcMain.handle("queue:add", (_e, jobInput: JobInput) => {
    logger.info("Queueing download:", jobInput.url);
    logger.debug("Job input details:", {
      url: jobInput.url,
      formatSelector: jobInput.formatSelector,
      outputTemplate: jobInput.outputTemplate,
      extra: jobInput.extra
    });

    // Validate URL
    const urlValidation = validateYouTubeUrl(jobInput.url);
    if (!urlValidation.valid) {
      logger.error("Invalid URL:", urlValidation.error);
      throw new Error(`Invalid URL: ${urlValidation.error}`);
    }

    // Validate output template
    const templateValidation = validateOutputTemplate(jobInput.outputTemplate);
    if (!templateValidation.valid) {
      logger.error("Invalid output template:", templateValidation.error);
      throw new Error(`Invalid output template: ${templateValidation.error}`);
    }

    // Validate format selector
    const formatValidation = validateFormatSelector(jobInput.formatSelector);
    if (!formatValidation.valid) {
      logger.error("Invalid format selector:", formatValidation.error);
      throw new Error(`Invalid format selector: ${formatValidation.error}`);
    }

    // Use cached cookies if available
    const cookieFile = cookies.getCookiesPath();
    if (cookieFile) {
      logger.debug("Using cached cookies for download:", cookieFile);
      jobInput = {
        ...jobInput,
        extra: {
          ...jobInput.extra,
          cookiesFile: cookieFile,
          cookiesFromBrowser: undefined
        }
      };
    } else {
      logger.debug("No cached cookies available");
    }

    const jobId = pool.enqueue(jobInput);
    logger.debug("Job queued with ID:", jobId);
    return jobId;
  });

  ipcMain.handle("queue:cancel", (_e, jobId: string) => {
    logger.debug("IPC: queue:cancel", jobId);
    return pool.cancel(jobId);
  });

  ipcMain.handle("queue:pause", (_e, jobId: string) => {
    logger.debug("IPC: queue:pause", jobId);
    return pool.pause(jobId);
  });

  ipcMain.handle("queue:resume", (_e, jobId: string) => {
    logger.debug("IPC: queue:resume", jobId);
    return pool.resume(jobId);
  });

  ipcMain.handle("queue:retry", (_e, jobId: string) => {
    logger.debug("IPC: queue:retry", jobId);
    return pool.retry(jobId);
  });

  ipcMain.handle("queue:getJobs", () => {
    return pool.getJobs();
  });

  ipcMain.handle("queue:setConcurrency", (_e, n: number) => {
    logger.debug("IPC: queue:setConcurrency", n);
    pool.setMaxConcurrent(n);
    return true;
  });

  ipcMain.handle("history:list", (_e, limit?: number, offset?: number) => {
    logger.debug("IPC: history:list", { limit, offset });
    return db.listHistory(limit, offset);
  });

  ipcMain.handle("history:delete", (_e, jobId: string) => {
    logger.debug("IPC: history:delete", jobId);
    db.deleteHistory(jobId);
    return true;
  });

  ipcMain.handle("history:bulkDelete", (_e, jobIds: string[]) => {
    logger.debug("IPC: history:bulkDelete", { count: jobIds.length });
    db.bulkDeleteHistory(jobIds);
    return true;
  });

  ipcMain.handle("fs:reveal", (_e, filePath: string) => {
    logger.debug("IPC: fs:reveal", filePath);
    shell.showItemInFolder(filePath);
  });

  ipcMain.handle("fs:open", async (_e, filePath: string) => {
    logger.debug("IPC: fs:open", filePath);
    const error = await shell.openPath(filePath);
    return error || null;
  });

  ipcMain.handle("fs:fileExists", async (_e, filePath: string) => {
    logger.debug("IPC: fs:fileExists", filePath);
    const fs = await import("node:fs");
    return fs.existsSync(filePath);
  });

  ipcMain.handle("fs:scanDir", async (_e, dirPath: string) => {
    logger.debug("IPC: fs:scanDir", dirPath);
    try {
      const fs = await import("node:fs");
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
    async (_e, opts: { title?: string; filters?: { name: string; extensions: string[] }[] }) => {
      logger.debug("IPC: dialog:openFile", opts);
      const result = await dialog.showOpenDialog(mainWindow, {
        title: opts?.title || "Select file",
        properties: ["openFile"],
        filters: opts?.filters || [{ name: "All Files", extensions: ["*"] }]
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0];
    }
  );

  ipcMain.handle("dialog:openFolder", async () => {
    logger.debug("IPC: dialog:openFolder");
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select download folder",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Cookie management - browser-based approach
  ipcMain.handle("cookies:info", (_e, browserSetting: string | null) => {
    logger.debug("Cookie info requested for:", browserSetting);
    return cookies.getCookieInfo(browserSetting);
  });

  ipcMain.handle("cookies:set", async (_e, browserSetting: string) => {
    logger.debug("IPC: cookies:set", browserSetting);
    logger.info("Setting cookies browser:", browserSetting);
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    const info = await cookies.refreshCookies(browserSetting, binaryPath, ffmpegPath);
    return info;
  });

  ipcMain.handle("cookies:refresh", async (_e, browserSetting: string | null) => {
    logger.debug("IPC: cookies:refresh", browserSetting);
    logger.info("Refreshing cookies for:", browserSetting);
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    return cookies.refreshCookies(browserSetting, binaryPath, ffmpegPath);
  });

  ipcMain.handle("cookies:clear", (_e, browserSetting: string | null) => {
    logger.debug("IPC: cookies:clear", browserSetting);
    logger.info("Clearing cookies");
    cookies.clearCookies();
    return cookies.getCookieInfo(browserSetting);
  });

  ipcMain.handle("cache:clearFormats", (_e, url?: string) => {
    logger.debug("IPC: cache:clearFormats", url);
    db.clearFormatCache(url);
  });

  ipcMain.handle("cache:clearDownloadArchive", async (_e, downloadPath: string) => {
    logger.debug("IPC: cache:clearDownloadArchive", downloadPath);
    const { unlinkSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");

    const archivePath = join(downloadPath, "archive.txt");
    if (existsSync(archivePath)) {
      try {
        unlinkSync(archivePath);
        logger.info("Download archive cleared:", archivePath);
        return { success: true };
      } catch (error) {
        logger.error("Failed to clear download archive:", error);
        return { success: false, error: String(error) };
      }
    }
    logger.info("Download archive not found, nothing to clear");
    return { success: true };
  });

  ipcMain.handle("app:info", async () => {
    logger.debug("IPC: app:info");
    const { binaryPath } = resolveBinaryPaths();
    let ytDlpVersion = "unknown";
    try {
      const { stdout } = await execFileAsync(binaryPath, ["--version"]);
      ytDlpVersion = stdout.trim();
    } catch {
      // Binary not found in dev, that's fine
    }
    return {
      appVersion: app.getVersion(),
      ytDlpVersion,
      defaultDownloadPath: app.getPath("videos")
    };
  });

  ipcMain.handle("dependencies:check", async () => {
    logger.debug("IPC: dependencies:check");
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    const status = await checkDependencies(binaryPath, ffmpegPath);
    logger.debug("Dependency check result:", status);
    return {
      ready: status.allReady,
      ytDlp: status.ytDlp,
      ffmpeg: status.ffmpeg,
      errors: status.errors,
      errorMessage: !status.allReady ? getDependencyErrorMessage(status) : null
    };
  });

  ipcMain.handle("dependencies:download", async () => {
    logger.debug("IPC: dependencies:download");
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    const destDir = join(binaryPath, "..");
    logger.debug("Downloading dependencies to:", destDir);

    await downloadDependencies(destDir, (progress) => {
      logger.debug("Dependency download progress:", progress);
      mainWindow?.webContents.send("dependency:download:progress", progress);
    });

    const status = await checkDependencies(binaryPath, ffmpegPath);
    return {
      ready: status.allReady,
      ytDlp: status.ytDlp,
      ffmpeg: status.ffmpeg,
      errors: status.errors,
      errorMessage: !status.allReady ? getDependencyErrorMessage(status) : null
    };
  });

  // YouTube search via yt-dlp ytsearch
  ipcMain.handle("search:youtube", async (_e, query: string, page: number = 0) => {
    logger.debug("IPC: search:youtube", { query, page });
    const { binaryPath } = resolveBinaryPaths();
    const count = 20;
    const safePage = Math.max(0, page);
    const requestedCount = count * (safePage + 1);
    const searchQuery = `ytsearch${requestedCount}:${query}`;
    const cookieFile = cookies.getCookiesPath();
    logger.debug("Search query:", searchQuery, "Using cookies:", !!cookieFile);

    const args = ["--dump-json", "--flat-playlist", "--no-playlist"];
    if (cookieFile) args.push("--cookies", cookieFile);
    args.push(searchQuery);

    try {
      const { stdout } = await execFileAsync(binaryPath, args, { maxBuffer: 10 * 1024 * 1024 });
      logger.debug("Search stdout length:", stdout.length);
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
        .filter(
          (
            item
          ): item is {
            id: string;
            title: string;
            url: string;
            thumbnail: string | null;
            duration: number | null;
            channel: string;
          } => item !== null
        );
      const paginatedResults = results.slice(safePage * count, (safePage + 1) * count);
      logger.debug("Search results count:", paginatedResults.length);
      return paginatedResults;
    } catch (err: unknown) {
      logger.error("Search failed:", err instanceof Error ? err.message : String(err));
      throw new Error(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // List available subtitle tracks for a video
  ipcMain.handle("subtitles:list", async (_e, url: string) => {
    logger.debug("IPC: subtitles:list", url);
    const { binaryPath } = resolveBinaryPaths();
    const cookieFile = cookies.getCookiesPath();
    logger.debug("Using cookies for subtitles:", !!cookieFile);

    const args = ["--dump-json", "--no-playlist"];
    if (cookieFile) args.push("--cookies", cookieFile);
    args.push(url);

    try {
      const { stdout } = await execFileAsync(binaryPath, args, { maxBuffer: 5 * 1024 * 1024 });
      logger.debug("Subtitles info retrieved");
      const info = JSON.parse(stdout.trim().split("\n")[0]);
      const tracks: { id: string; name: string; ext: string; isAutoGenerated: boolean }[] = [];

      const subtitles: Record<string, { name?: string; ext?: string }[]> = info.subtitles || {};
      const autoCaptions: Record<string, { name?: string; ext?: string }[]> =
        info.automatic_captions || {};

      for (const [langCode, formats] of Object.entries(subtitles)) {
        const firstFormat = formats?.[0];
        tracks.push({
          id: langCode,
          name: firstFormat?.name || langCode,
          ext: firstFormat?.ext || "vtt",
          isAutoGenerated: false
        });
      }

      for (const [langCode, formats] of Object.entries(autoCaptions)) {
        if (!subtitles[langCode]) {
          const firstFormat = formats?.[0];
          tracks.push({
            id: langCode,
            name: (firstFormat?.name || langCode) + " (auto)",
            ext: firstFormat?.ext || "vtt",
            isAutoGenerated: true
          });
        }
      }

      logger.debug("Subtitle tracks found:", tracks.length);
      return tracks;
    } catch (err: unknown) {
      logger.error("Failed to list subtitles:", err instanceof Error ? err.message : String(err));
      throw new Error(
        `Failed to list subtitles: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  });

  // App update management
  ipcMain.handle("app:checkUpdate", async () => {
    logger.debug("IPC: app:checkUpdate");
    try {
      // Try electron-updater if available
      const { autoUpdater } = await import("electron-updater").catch(() => ({
        autoUpdater: null
      }));

      if (!autoUpdater) {
        logger.debug("electron-updater not available");
        return { updateAvailable: false };
      }

      logger.debug("Checking for updates...");
      return new Promise<{ updateAvailable: boolean; version?: string }>((resolve) => {
        const timeout = setTimeout(() => {
          logger.debug("Update check timeout");
          resolve({ updateAvailable: false });
        }, 10000);

        autoUpdater.once("update-available", (info: { version: string }) => {
          clearTimeout(timeout);
          logger.debug("Update available:", info.version);
          resolve({ updateAvailable: true, version: info.version });
        });

        autoUpdater.once("update-not-available", () => {
          clearTimeout(timeout);
          logger.debug("No update available");
          resolve({ updateAvailable: false });
        });

        autoUpdater.once("error", (err: Error) => {
          clearTimeout(timeout);
          logger.debug("Update check error:", err.message);
          resolve({ updateAvailable: false });
        });

        autoUpdater.checkForUpdates().catch(() => {
          clearTimeout(timeout);
          resolve({ updateAvailable: false });
        });
      });
    } catch {
      return { updateAvailable: false };
    }
  });

  ipcMain.handle("app:installUpdate", async () => {
    logger.debug("IPC: app:installUpdate");
    try {
      const { autoUpdater } = await import("electron-updater");
      logger.debug("Installing update and quitting");
      autoUpdater.quitAndInstall();
    } catch {
      logger.debug("electron-updater not available for install");
    }
  });

  ipcMain.handle("app:quit", () => {
    logger.debug("IPC: app:quit");
    vaultApp.isQuitting = true;
    logger.info("Quitting application");
    app.quit();
  });

  // Logger IPC
  ipcMain.handle("logs:history", () => {
    return logger.history();
  });

  // Window controls (used by CustomTitlebar)
  ipcMain.handle("window:minimize", () => {
    logger.debug("IPC: window:minimize");
    mainWindow?.minimize();
  });
  ipcMain.handle("window:maximize", () => {
    logger.debug("IPC: window:maximize");
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle("window:close", () => {
    logger.debug("IPC: window:close");
    mainWindow?.close();
  });
}

// Initialize the app when ready
app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.vault.app");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  const { binaryPath, ffmpegPath, pluginPath } = resolveBinaryPaths();

  logger.info("Vault started, version", app.getVersion());

  // Check dependencies before starting
  const depStatus = await checkDependencies(binaryPath, ffmpegPath);
  if (!depStatus.allReady) {
    logger.error("Dependencies missing:", depStatus.errors);
  } else {
    logger.info("All dependencies ready");
    logger.info(`yt-dlp: ${depStatus.ytDlp.version}`);
    logger.info(`ffmpeg: ${depStatus.ffmpeg.version}`);
  }

  ytdlp = createYtDlpManager({
    binaryPath,
    ffmpegPath,
    pluginPath,
    userDataPath: app.getPath("userData")
  });

  pool = createWorkerPool({ ytdlp, maxConcurrent: 3 });
  db = initDb(join(app.getPath("userData"), "library.db"));

  logger.info("IPC handlers registered");
  registerIpcHandlers();
  createWindow();
  forwardPoolEventsToRenderer();

  // Set up auto-updater event forwarding (best-effort)
  try {
    const { autoUpdater } = await import("electron-updater");
    autoUpdater.on("update-available", (info: { version: string }) => {
      mainWindow?.webContents.send("update:available", info);
    });
    autoUpdater.on("update-downloaded", (info: { version: string }) => {
      mainWindow?.webContents.send("update:downloaded", info);
    });
    // Check silently on startup
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  } catch {
    // electron-updater not configured — skip silently
  }
});

app.on("activate", function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  vaultApp.isQuitting = true;
  // Gracefully close the SQLite connection
  if (db?.raw) {
    db.raw.close();
  }
});
