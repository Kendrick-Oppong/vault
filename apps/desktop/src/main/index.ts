import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "node:path";
import { statSync } from "node:fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import icon from "../../resources/icon.png?asset";
import { YtDlpManager } from "./ytdlp-manager";
import { WorkerPool } from "./worker-pool";
import { initDb, type VaultDb } from "./db";
import { JobInput } from "@vault/types";
import { validateYouTubeUrl, validateOutputTemplate, validateFormatSelector } from "./validators";
import { checkDependencies, getDependencyErrorMessage } from "./dependencies";
import * as cookies from "./cookies";

// Must be set before app.whenReady() — hides Electron automation signals from Google
app.commandLine.appendSwitch("disable-blink-features", "AutomationControlled");

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
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
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
  const send = (channel: string, ...args: unknown[]): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
    }
  };

  pool.on("job:queued", (job) => send("job:queued", job));
  pool.on("job:started", (job) => send("job:started", job));
  pool.on("job:progress", (jobId, progress) => send("job:progress", jobId, progress));
  pool.on("job:paused", (job) => send("job:paused", job));

  pool.on("job:completed", (job) => {
    // Try to get actual file size from disk
    let fileSize: number | null = null;
    if (job.meta?.expectedPath) {
      try {
        fileSize = statSync(job.meta.expectedPath).size;
      } catch {
        // File may not exist yet or path is wrong
      }
    }
    db.addHistoryEntry({
      job_id: job.id,
      video_id: job.meta?.videoId ?? null,
      title: job.meta?.title ?? null,
      channel: job.meta?.channel ?? null,
      url: job.url,
      file_path: job.meta?.expectedPath ?? null,
      thumbnail_url: job.meta?.thumbnailUrl ?? null,
      status: "completed",
      media_type: job.meta?.mediaType ?? null,
      quality: job.meta?.quality ?? null,
      file_size: fileSize,
      created_at: job.createdAt,
      completed_at: Date.now()
    });
    if (job.extra?.archiveKey && job.meta?.videoId) {
      db.markArchived(job.extra.archiveKey, job.meta.videoId);
    }
    send("job:completed", job);
  });

  pool.on("job:failed", (job, err) => {
    db.addHistoryEntry({
      job_id: job.id,
      video_id: job.meta?.videoId ?? null,
      title: job.meta?.title ?? null,
      channel: job.meta?.channel ?? null,
      url: job.url,
      file_path: null,
      thumbnail_url: job.meta?.thumbnailUrl ?? null,
      status: "failed",
      media_type: job.meta?.mediaType ?? null,
      quality: job.meta?.quality ?? null,
      file_size: null,
      created_at: job.createdAt,
      completed_at: Date.now()
    });
    send("job:failed", job, { message: err.message, stderr: err.stderr });
  });

  pool.on("job:cancelled", (job) => {
    db.addHistoryEntry({
      job_id: job.id,
      video_id: job.meta?.videoId ?? null,
      title: job.meta?.title ?? null,
      channel: job.meta?.channel ?? null,
      url: job.url,
      file_path: null,
      thumbnail_url: job.meta?.thumbnailUrl ?? null,
      status: "cancelled",
      media_type: job.meta?.mediaType ?? null,
      quality: job.meta?.quality ?? null,
      file_size: null,
      created_at: job.createdAt,
      completed_at: Date.now()
    });
    send("job:cancelled", job);
  });
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

  ipcMain.handle("dialog:openFile", async (_e, opts: { title?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: opts?.title || "Select file",
      properties: ["openFile"],
      filters: opts?.filters || [{ name: "All Files", extensions: ["*"] }]
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
    // Setting a browser triggers an initial export attempt
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

  ytdlp = new YtDlpManager({ binaryPath, ffmpegPath, pluginPath});

  pool = new WorkerPool({ ytdlp, maxConcurrent: 3 });
  db = initDb(join(app.getPath("userData"), "library.db"));

  registerIpcHandlers();
  createWindow();
  forwardPoolEventsToRenderer();
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
  // Gracefully close the SQLite connection
  if (db?.raw) {
    db.raw.close();
  }
});
