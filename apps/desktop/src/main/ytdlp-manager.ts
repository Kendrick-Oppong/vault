import { spawn, type ChildProcess } from "node:child_process";
import type { YtDlpProgress, DownloadExtras } from "@vault/types";

export interface YtDlpManagerOptions {
  binaryPath: string;
  ffmpegPath: string;
  pluginPath?: string;
}

export class YtDlpManager {
  constructor(private readonly opts: YtDlpManagerOptions) {}

  /**
   * Probe formats/info for a given URL
   */
  async probeFormats(url: string, extras?: DownloadExtras): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const args = [
        "--dump-json",
        "--flat-playlist",
        "--js-runtimes",
        `node:${process.execPath}`,
      ];

      // Add plugin directory if available (for ChromeCookieUnlock plugin)
      if (this.opts.pluginPath) {
        args.push("--plugin-dirs", this.opts.pluginPath);
        console.log(`[yt-dlp probe] Using plugin directory: ${this.opts.pluginPath}`);
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
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error(`yt-dlp probe failed: ${stderr}`));
        }
        try {
          const lines = stdout.trim().split("\n");
          const formats = lines.map((line) => JSON.parse(line));
          resolve(formats);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  /**
   * Download a video with progress reporting
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
      `node:${process.execPath}`
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
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
    });

    let stderr = "";
    let stdoutInfo = "";

    proc.stdout.on("data", (chunk) => {
      const lines = chunk.toString().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const progress = JSON.parse(line);
          onProgress?.(progress);
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
          // Combine stderr + captured stdout info for complete error picture
          const details = [stderr.trim(), stdoutInfo.trim()].filter(Boolean).join("\n");
          const err = new Error(`yt-dlp download failed (code ${code}): ${details}`) as Error & { stderr?: string };
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
}
