import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "node:path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import icon from "../../resources/icon.png?asset";
import { createYtDlpManager, type YtDlpManager } from "./ytdlp-manager";
import { createWorkerPool, type WorkerPool } from "./worker-pool";
import { initDb, type VaultDb } from "./db";
import { JobInput } from "@vault/types";
import { validateYouTubeUrl, validateOutputTemplate, validateFormatSelector } from "./validators";
import { checkDependencies, getDependencyErrorMessage, downloadDependencies } from "./dependencies";
import * as cookies from "./cookies";
import { createTray } from "./tray";

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
  pool.on("job:completed", (job) => mainWindow?.webContents.send("job:completed", job));
  pool.on("job:failed", (job, err) => mainWindow?.webContents.send("job:failed", job, err));
  pool.on("job:cancelled", (job) => mainWindow?.webContents.send("job:cancelled", job));
  pool.on("job:paused", (job) => mainWindow?.webContents.send("job:paused", job));

  // Forward window state changes to renderer (for custom titlebar)
  mainWindow.on("maximize", () => mainWindow?.webContents.send("window:maximized"));
  mainWindow.on("unmaximize", () => mainWindow?.webContents.send("window:unmaximized"));
}

function registerIpcHandlers(): void {
  ipcMain.handle("formats:probe", async (_e, url: string) => {
    const cached = db.getCachedFormats(url);
    if (cached) return cached;

    // Use cached cookies if available
    const cookieFile = cookies.getCookiesPath();
    const probeExtras = cookieFile ? { cookiesFile: cookieFile } : undefined;

    const formats = await ytdlp.probeFormats(url, probeExtras);
    db.setCachedFormats(url, formats);
    return formats;
  });

  // Intercept downloads: validate URL and format, inject cookies if available
  ipcMain.handle("queue:add", (_e, jobInput: JobInput) => {
    // Validate URL
    const urlValidation = validateYouTubeUrl(jobInput.url);
    if (!urlValidation.valid) {
      throw new Error(`Invalid URL: ${urlValidation.error}`);
    }

    // Validate output template
    const templateValidation = validateOutputTemplate(jobInput.outputTemplate);
    if (!templateValidation.valid) {
      throw new Error(`Invalid output template: ${templateValidation.error}`);
    }

    // Validate format selector
    const formatValidation = validateFormatSelector(jobInput.formatSelector);
    if (!formatValidation.valid) {
      throw new Error(`Invalid format selector: ${formatValidation.error}`);
    }

    // Use cached cookies if available
    const cookieFile = cookies.getCookiesPath();
    if (cookieFile) {
      jobInput = {
        ...jobInput,
        extra: {
          ...jobInput.extra,
          cookiesFile: cookieFile,
          cookiesFromBrowser: undefined
        }
      };
    }

    return pool.enqueue(jobInput);
  });

  ipcMain.handle("queue:cancel", (_e, jobId: string) => pool.cancel(jobId));

  ipcMain.handle("queue:pause", (_e, jobId: string) => pool.pause(jobId));

  ipcMain.handle("queue:resume", (_e, jobId: string) => pool.resume(jobId));

  ipcMain.handle("queue:retry", (_e, jobId: string) => pool.retry(jobId));

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

  ipcMain.handle("fs:reveal", (_e, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  ipcMain.handle("fs:open", async (_e, filePath: string) => {
    const error = await shell.openPath(filePath);
    return error || null;
  });

  ipcMain.handle(
    "dialog:openFile",
    async (_e, opts: { title?: string; filters?: { name: string; extensions: string[] }[] }) => {
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
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select download folder",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Cookie management - browser-based approach
  ipcMain.handle("cookies:info", (_e, browserSetting: string | null) => {
    return cookies.getCookieInfo(browserSetting);
  });

  ipcMain.handle("cookies:set", async (_e, browserSetting: string) => {
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    const info = await cookies.refreshCookies(browserSetting, binaryPath, ffmpegPath);
    return info;
  });

  ipcMain.handle("cookies:refresh", async (_e, browserSetting: string | null) => {
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    return cookies.refreshCookies(browserSetting, binaryPath, ffmpegPath);
  });

  ipcMain.handle("cookies:clear", (_e, browserSetting: string | null) => {
    cookies.clearCookies();
    return cookies.getCookieInfo(browserSetting);
  });

  ipcMain.handle("cache:clearFormats", (_e, url?: string) => {
    db.clearFormatCache(url);
  });

  ipcMain.handle("app:info", async () => {
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
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    const status = await checkDependencies(binaryPath, ffmpegPath);
    return {
      ready: status.allReady,
      ytDlp: status.ytDlp,
      ffmpeg: status.ffmpeg,
      errors: status.errors,
      errorMessage: !status.allReady ? getDependencyErrorMessage(status) : null
    };
  });

  ipcMain.handle("dependencies:download", async () => {
    const { binaryPath, ffmpegPath } = resolveBinaryPaths();
    const destDir = join(binaryPath, "..");

    await downloadDependencies(destDir, (progress) => {
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
    const { binaryPath } = resolveBinaryPaths();
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
      return results.slice(safePage * count, (safePage + 1) * count);
    } catch (err: unknown) {
      throw new Error(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // List available subtitle tracks for a video
  ipcMain.handle("subtitles:list", async (_e, url: string) => {
    const { binaryPath } = resolveBinaryPaths();
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

      return tracks;
    } catch (err: unknown) {
      throw new Error(
        `Failed to list subtitles: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  });

  // App update management
  ipcMain.handle("app:checkUpdate", async () => {
    try {
      // Try electron-updater if available
      const { autoUpdater } = await import("electron-updater").catch(() => ({
        autoUpdater: null
      }));

      if (!autoUpdater) {
        return { updateAvailable: false };
      }

      return new Promise<{ updateAvailable: boolean; version?: string }>((resolve) => {
        const timeout = setTimeout(() => resolve({ updateAvailable: false }), 10000);

        autoUpdater.once("update-available", (info: { version: string }) => {
          clearTimeout(timeout);
          resolve({ updateAvailable: true, version: info.version });
        });

        autoUpdater.once("update-not-available", () => {
          clearTimeout(timeout);
          resolve({ updateAvailable: false });
        });

        autoUpdater.once("error", () => {
          clearTimeout(timeout);
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
    try {
      const { autoUpdater } = await import("electron-updater");
      autoUpdater.quitAndInstall();
    } catch {
      // electron-updater not available
    }
  });

  ipcMain.handle("app:quit", () => {
    vaultApp.isQuitting = true;
    app.quit();
  });

  // Window controls (used by CustomTitlebar)
  ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  ipcMain.handle("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle("window:close", () => mainWindow?.close());
}

// Initialize the app when ready
app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.vault.app");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  const { binaryPath, ffmpegPath, pluginPath } = resolveBinaryPaths();

  // Check dependencies before starting
  const depStatus = await checkDependencies(binaryPath, ffmpegPath);
  if (!depStatus.allReady) {
    console.error("[Vault] Dependencies missing:", depStatus.errors);
  } else {
    console.log("[Vault] All dependencies ready");
    console.log(`[Vault] yt-dlp: ${depStatus.ytDlp.version}`);
    console.log(`[Vault] ffmpeg: ${depStatus.ffmpeg.version}`);
  }

  ytdlp = createYtDlpManager({ binaryPath, ffmpegPath, pluginPath });

  pool = createWorkerPool({ ytdlp, maxConcurrent: 3 });
  db = initDb(join(app.getPath("userData"), "library.db"));

  registerIpcHandlers();
  createWindow();
  forwardPoolEventsToRenderer();

  // Wire up system tray (always created; tray.ts handles minimize-to-tray via close event)
  createTray(mainWindow);

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
