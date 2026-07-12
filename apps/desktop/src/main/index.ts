import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import icon from "../../resources/icon.png?asset";
import { YtDlpManager } from "./ytdlp-manager";
import { WorkerPool } from "./worker-pool";
import { initDb, type VaultDb } from "./db";
import { JobInput } from "@vault/types";

const execFileAsync = promisify(execFile);

let mainWindow: BrowserWindow;
let pool: WorkerPool;
let db: VaultDb;
let ytdlp: YtDlpManager;

function resolveBinaryPaths(): { binaryPath: string; ffmpegPath: string } {
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
    ffmpegPath: join(base, `ffmpeg${ext}`)
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

  pool.on("job:completed", (job) => {
    db.addHistoryEntry({
      job_id: job.id,
      video_id: job.meta?.videoId ?? null,
      title: job.meta?.title ?? null,
      channel: job.meta?.channel ?? null,
      url: job.url,
      file_path: job.meta?.expectedPath ?? null,
      thumbnail_url: job.meta?.thumbnailUrl ?? null,
      status: "completed",
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

    const formats = await ytdlp.probeFormats(url);
    db.setCachedFormats(url, formats);
    return formats;
  });

  ipcMain.handle("queue:add", (_e, jobInput: JobInput) => pool.enqueue(jobInput));

  ipcMain.handle("queue:cancel", (_e, jobId: string) => pool.cancel(jobId));

  ipcMain.handle("queue:setConcurrency", (_e, n: number) => {
    pool.setMaxConcurrent(n);
    return true;
  });

  ipcMain.handle("history:list", (_e, limit?: number, offset?: number) =>
    db.listHistory(limit, offset)
  );

  ipcMain.handle("fs:reveal", (_e, filePath: string) => {
    shell.showItemInFolder(filePath);
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
}

// Initialize the app when ready
app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.vault.app");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  const { binaryPath, ffmpegPath } = resolveBinaryPaths();
  ytdlp = new YtDlpManager({ binaryPath, ffmpegPath });

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
