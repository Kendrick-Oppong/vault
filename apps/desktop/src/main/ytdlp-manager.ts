import { spawn, type ChildProcess } from "node:child_process";
import type { YtDlpProgress, DownloadExtras } from "@vault/types";
import { validateYouTubeUrl } from "./validators";

export interface YtDlpManagerOptions {
  binaryPath: string;
  ffmpegPath: string;
  pluginPath?: string;
}

export interface ProbeOptions extends DownloadExtras {
  retries?: number;
  timeout?: number;
}

export class YtDlpManager {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds for probe
  private readonly DEFAULT_RETRIES = 2;

  constructor(private readonly opts: YtDlpManagerOptions) {}

  /**
   * Probe formats/info for a given URL with retry logic
   */
  async probeFormats(
    url: string,
    extras?: ProbeOptions
  ): Promise<Record<string, unknown>[]> {
    // Validate URL before probing
    const validation = validateYouTubeUrl(url);
    if (!validation.valid) {
      throw new Error(`Invalid YouTube URL: ${validation.error}`);
    }

    const retries = extras?.retries ?? this.DEFAULT_RETRIES;
    const timeout = extras?.timeout ?? this.DEFAULT_TIMEOUT;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.probFormatsInternal(url, extras, timeout);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          console.log(
            `[yt-dlp] Probe failed (attempt ${attempt + 1}/${retries + 1}), ` +
            `retrying in ${delay}ms: ${lastError.message}`
          );
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }

    throw new Error(
      `yt-dlp probe failed after ${retries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Internal probe implementation with timeout
   */
  private probFormatsInternal(
    url: string,
    extras?: DownloadExtras,
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const args = [
        "--dump-json",
        "--flat-playlist",
        "--js-runtimes",
        `node:${process.execPath}`,
        "--quiet",
        "--no-warnings"
      ];

      // Add plugin directory if available (for ChromeCookieUnlock plugin)
      if (this.opts.pluginPath) {
        args.push("--plugin-dirs", this.opts.pluginPath);
      }

      // Add cookies for private/age-restricted videos
      if (extras?.cookiesFile) {
        args.push("--cookies", extras.cookiesFile);
      } else if (extras?.cookiesFromBrowser) {
        args.push("--cookies-from-browser", extras.cookiesFromBrowser);
      }

      args.push(url);

      const proc = spawn(this.opts.binaryPath, args, {
        shell: false,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        timeout
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill("SIGTERM");
      }, timeout);

      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("close", (code) => {
        clearTimeout(timeoutHandle);

        if (timedOut) {
          return reject(new Error(`yt-dlp probe timed out after ${timeout}ms`));
        }

        if (code !== 0) {
          // Parse error messages for user-friendly output
          const errorMsg = this.parseYtDlpError(stderr);
          return reject(new Error(`yt-dlp probe failed: ${errorMsg || stderr}`));
        }

        try {
          const lines = stdout.trim().split("\n").filter(l => l.trim());
          if (lines.length === 0) {
            return reject(new Error("yt-dlp returned no data"));
          }
          const formats = lines.map((line) => JSON.parse(line));
          resolve(formats);
        } catch (err) {
          reject(new Error(`Failed to parse yt-dlp output: ${err instanceof Error ? err.message : String(err)}`));
        }
      });

      proc.on("error", (err) => {
        clearTimeout(timeoutHandle);
        reject(err);
      });
    });
  }

  /**
   * Download a video with progress reporting and enhanced error handling
   */
  download(
    url: string,
    outputTemplate: string,
    formatSelector: string,
    extras?: DownloadExtras,
    onProgress?: (progress: YtDlpProgress) => void
  ): { process: ChildProcess; promise: Promise<void> } {
    const args = [
      "--ffmpeg-location",
      this.opts.ffmpegPath,
      "--output",
      outputTemplate,
      "--format",
      formatSelector,
      "--progress",
      "--newline",
      "--js-runtimes",
      `node:${process.execPath}`,
      "--no-part",
      "--prefer-free-formats"
    ];

    console.log(`[yt-dlp] FFmpeg location: ${this.opts.ffmpegPath}`);
    console.log(`[yt-dlp] Format selector: ${formatSelector}`);

    // Add plugin directory if available (for ChromeCookieUnlock plugin)
    if (this.opts.pluginPath) {
      args.push("--plugin-dirs", this.opts.pluginPath);
      console.log(`[yt-dlp] Using plugin directory: ${this.opts.pluginPath}`);
    }

    // Add extras
    if (extras?.cookiesFile) {
      // Use cookies file (takes priority over browser cookies — avoids Chrome DB lock issue)
      args.push("--cookies", extras.cookiesFile);
    } else if (extras?.cookiesFromBrowser) {
      args.push("--cookies-from-browser", extras.cookiesFromBrowser);
    }
    if (extras?.rateLimit) {
      args.push("--limit-rate", extras.rateLimit);
    }
    if (extras?.proxy) {
      args.push("--proxy", extras.proxy);
    }
    if (extras?.geoBypass) {
      args.push("--geo-bypass");
    }
    if (extras?.embedThumbnail) {
      // Use --embed-thumbnail with --ppa for safer thumbnail embedding
      // This tells ffmpeg to use mkv container which supports all thumbnail formats
      args.push("--embed-thumbnail", "--ppa", "EmbedThumbnail:-c copy");
    }
    if (extras?.embedMetadata) {
      args.push("--embed-metadata");
    }
    if (extras?.subtitles === "external") {
      args.push("--write-subs", "--sub-lang", "en");
    } else if (extras?.subtitles === "burned") {
      args.push("--embed-subs");
    }
    if (extras?.downloadArchive) {
      args.push("--download-archive", extras.downloadArchive);
    }

    args.push(url);

    const proc = spawn(this.opts.binaryPath, args, {
      shell: false,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = "";
    let stdoutInfo = "";
    let lastProgress: YtDlpProgress | null = null;

    proc.stdout.on("data", (chunk) => {
      const lines = chunk.toString().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const progress = JSON.parse(line) as YtDlpProgress;
          lastProgress = progress;
          // Normalize progress data
          const normalized = this.normalizeProgress(progress);
          onProgress?.(normalized);
        } catch {
          // Non-JSON stdout lines (warnings, info) — capture for error reporting
          stdoutInfo += line + "\n";
        }
      }
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const promise = new Promise<void>((resolve, reject) => {
      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Parse and provide user-friendly error message
          const errorMsg = this.parseYtDlpError(stderr);
          const details = [errorMsg || stderr.trim(), stdoutInfo.trim()].filter(Boolean).join("\n");
          const err = new Error(
            `yt-dlp download failed (code ${code}): ${details}`
          ) as Error & { stderr?: string };
          err.stderr = details;
          reject(err);
        }
      });
      
      proc.on("error", (err) => {
        reject(err);
      });
    });

    return { process: proc, promise };
  }

  /**
   * Normalize yt-dlp progress output to standardized format
   */
  private normalizeProgress(raw: YtDlpProgress): YtDlpProgress {
    // Calculate percentage if bytes data available
    if (raw.total_bytes && raw.downloaded_bytes) {
      return {
        ...raw,
        percent: (raw.downloaded_bytes / raw.total_bytes) * 100
      };
    }

    if (raw.total_bytes_estimate && raw.downloaded_bytes) {
      return {
        ...raw,
        percent: (raw.downloaded_bytes / raw.total_bytes_estimate) * 100
      };
    }

    return raw;
  }

  /**
   * Parse yt-dlp error messages for better UX
   */
  private parseYtDlpError(stderr: string): string {
    if (!stderr) return '';

    // Handle common error patterns
    if (stderr.includes('ERROR: Requested format is not available')) {
      return 'Requested format is not available for this video. Try a different format.';
    }

    if (stderr.includes('ERROR: Sign in to confirm')) {
      return 'Video requires sign-in. Please enable cookies or use YouTube auth.';
    }

    if (stderr.includes('ERROR: This live event will begin in')) {
      return 'This is a live event that hasn\'t started yet.';
    }

    if (stderr.includes('ERROR: This video is age restricted')) {
      return 'Video is age-restricted. Enable cookies or sign in to access it.';
    }

    if (stderr.includes('HTTP Error 403')) {
      return 'Access forbidden. The video may be private or unavailable in your region.';
    }

    if (stderr.includes('HTTP Error 404')) {
      return 'Video not found. It may have been deleted or the URL is incorrect.';
    }

    if (stderr.includes('Connection refused')) {
      return 'Connection failed. Check your internet connection.';
    }

    // Return first line of error for other cases
    const firstLine = stderr.split('\n')[0];
    return firstLine?.trim() || stderr.slice(0, 200);
  }
}
