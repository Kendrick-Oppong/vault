import { app, shell, BrowserWindow, ipcMain, dialog, session } from "electron";
import { join } from "node:path";
import { statSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import icon from "../../resources/icon.png?asset";
import { YtDlpManager } from "./ytdlp-manager";
import { WorkerPool } from "./worker-pool";
import { initDb, type VaultDb } from "./db";
import { JobInput } from "@vault/types";

// Must be set before app.whenReady() — hides Electron automation signals from Google
app.commandLine.appendSwitch("disable-blink-features", "AutomationControlled");

const COOKIES_FILE_PATH = join(app.getPath("userData"), "youtube-cookies.txt");

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

    // Pass cookies file to probe if it exists (needed for private/age-restricted videos)
    const probeExtras = existsSync(COOKIES_FILE_PATH)
      ? { cookiesFile: COOKIES_FILE_PATH }
      : undefined;
    const formats = await ytdlp.probeFormats(url, probeExtras);
    db.setCachedFormats(url, formats);
    return formats;
  });

  // Intercept downloads: if the app's cookies file exists (from built-in sign-in),
  // always use it — takes priority over --cookies-from-browser and avoids the
  // Chrome database lock issue entirely.
  ipcMain.handle("queue:add", (_e, jobInput: JobInput) => {
    if (existsSync(COOKIES_FILE_PATH)) {
      jobInput = {
        ...jobInput,
        extra: {
          ...jobInput.extra,
          cookiesFile: COOKIES_FILE_PATH,
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

  // Import cookies from JSON file (exported by browser extensions like "Get cookies.txt LOCALLY")
  ipcMain.handle("cookies:import", async (_e, jsonFilePath: string) => {
    try {
      const { readFile: readFileAsync } = await import("node:fs/promises");
      const jsonContent = await readFileAsync(jsonFilePath, "utf-8");
      const cookies = JSON.parse(jsonContent);

      if (!Array.isArray(cookies)) {
        return { success: false, error: "Invalid JSON format: expected an array of cookies" };
      }

      // Convert JSON cookies to Netscape format
      const lines = [
        "# Netscape HTTP Cookie File",
        "# Imported from JSON by Vault",
        ""
      ];

      for (const cookie of cookies) {
        if (!cookie.name || !cookie.value) continue;

        const domain = cookie.domain || ".youtube.com";
        const includeSubdomains = cookie.hostOnly === false || domain.startsWith(".") ? "TRUE" : "FALSE";
        const path = cookie.path || "/";
        const secure = cookie.secure ? "TRUE" : "FALSE";
        const expiry = cookie.expirationDate ? Math.floor(cookie.expirationDate) : 0;
        
        lines.push(`${domain}\t${includeSubdomains}\t${path}\t${secure}\t${expiry}\t${cookie.name}\t${cookie.value}`);
      }
      lines.push("");

      await writeFile(COOKIES_FILE_PATH, lines.join("\n"), "utf-8");
      return { success: true, filePath: COOKIES_FILE_PATH };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Built-in YouTube login — opens a browser window, extracts cookies after login
  ipcMain.handle("auth:youtubeLogin", async () => {
    // Use a persistent partition so the user doesn't have to log in every time
    const authPartition = session.fromPartition("persist:youtube-auth");

    // Override user agent to look like regular Chrome — Google blocks Electron's default UA
    // Using latest stable Chrome version to avoid Google's outdated browser detection
    const chromeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    
    authPartition.setUserAgent(chromeUA);

    const authWin = new BrowserWindow({
      width: 1000,
      height: 750,
      title: "Sign in to YouTube",
      parent: mainWindow,
      modal: true,
      webPreferences: {
        session: authPartition,
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // Also set user agent on the window's web contents
    authWin.webContents.setUserAgent(chromeUA);

    // Inject stealth patches before Google's detection scripts run.
    // --disable-blink-features=AutomationControlled handles navigator.webdriver at
    // the engine level, but Google also checks window.chrome, navigator.plugins, etc.
    authWin.webContents.on("dom-ready", () => {
      authWin.webContents.executeJavaScript(`
        // Restore window.chrome to look like regular Chrome
        if (!window.chrome) {
          window.chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {}
          };
        }
        
        // Mock navigator.plugins (empty in Electron)
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
          ]
        });
        
        // Mock navigator.languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });
        
        // Override permissions API to behave like Chrome
        if (navigator.permissions) {
          const origQuery = navigator.permissions.query.bind(navigator.permissions);
          navigator.permissions.query = (params) =>
            params.name === 'notifications'
              ? Promise.resolve({ state: Notification.permission, onchange: null })
              : origQuery(params);
        }
        
        // Additional Google bot detection bypasses
        // Override webdriver property (backup in case commandLine switch fails)
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
        
        // Mock hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => 8
        });
        
        // Mock device memory
        if (!navigator.deviceMemory) {
          Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8
          });
        }
        
        // Mock connection type
        if (!navigator.connection) {
          Object.defineProperty(navigator, 'connection', {
            get: () => ({
              effectiveType: '4g',
              rtt: 50,
              downlink: 10,
              saveData: false
            })
          });
        }
        
        // Override toString methods to hide tampering
        const originalFn = Function.prototype.toString;
        Function.prototype.toString = function() {
          if (this === navigator.plugins.get || this === navigator.languages.get) {
            return 'function get() { [native code] }';
          }
          return originalFn.call(this);
        };
      `).catch(() => {});
    });

    await authWin.loadURL("https://www.youtube.com/signin");

    return new Promise<{ success: boolean; filePath: string | null; error?: string }>((resolve) => {
      let resolved = false;

      const finish = async (success: boolean, error?: string) => {
        if (resolved) return;
        resolved = true;

        if (success) {
          try {
            const allCookies = await authPartition.cookies.get({});
            const ytCookies = allCookies.filter((c) =>
              c.domain?.includes("youtube.com") || c.domain?.includes("google.com")
            );

            if (ytCookies.length === 0) {
              authWin.close();
              resolve({ success: false, filePath: null, error: "No YouTube cookies found after login" });
              return;
            }

            // Write Netscape cookies.txt format
            const lines = [
              "# Netscape HTTP Cookie File",
              "# Generated by Vault — do not edit manually",
              ""
            ];
            for (const c of ytCookies) {
              const domain = c.domain || ".youtube.com";
              const includeSubdomains = domain.startsWith(".") ? "TRUE" : "FALSE";
              const path = c.path || "/";
              const secure = c.secure ? "TRUE" : "FALSE";
              const expiry = c.expirationDate ? Math.floor(c.expirationDate) : 0;
              lines.push(`${domain}\t${includeSubdomains}\t${path}\t${secure}\t${expiry}\t${c.name}\t${c.value}`);
            }
            lines.push("");

            writeFileSync(COOKIES_FILE_PATH, lines.join("\n"), "utf-8");
            authWin.close();
            resolve({ success: true, filePath: COOKIES_FILE_PATH });
          } catch (err) {
            authWin.close();
            resolve({ success: false, filePath: null, error: err instanceof Error ? err.message : String(err) });
          }
        } else {
          authWin.close();
          resolve({ success: false, filePath: null, error });
        }
      };

      // Poll for login — check for SID cookie every 2 seconds
      const pollInterval = setInterval(async () => {
        if (authWin.isDestroyed()) {
          clearInterval(pollInterval);
          finish(false, "Window closed");
          return;
        }
        try {
          const cookies = await authPartition.cookies.get({ url: "https://www.youtube.com" });
          const hasSid = cookies.some(
            (c) => c.name === "SID" || c.name === "__Secure-3PSID" || c.name === "SAPISID"
          );
          if (hasSid) {
            clearInterval(pollInterval);
            // Small delay to let all post-login cookies settle
            setTimeout(() => finish(true), 1500);
          }
        } catch {
          // ignore poll errors
        }
      }, 2000);

      authWin.on("closed", () => {
        clearInterval(pollInterval);
        finish(false, "Window closed before login");
      });
    });
  });

  ipcMain.handle("auth:checkCookies", () => {
    return existsSync(COOKIES_FILE_PATH);
  });

  ipcMain.handle("auth:clearCookies", () => {
    try {
      if (existsSync(COOKIES_FILE_PATH)) unlinkSync(COOKIES_FILE_PATH);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("auth:getCookiesPath", () => {
    return existsSync(COOKIES_FILE_PATH) ? COOKIES_FILE_PATH : null;
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

  const { binaryPath, ffmpegPath, pluginPath } = resolveBinaryPaths();
  ytdlp = new YtDlpManager({ binaryPath, ffmpegPath, pluginPath });

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
