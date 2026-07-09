import { spawn, type ChildProcess } from "node:child_process";
import type { YtDlpProgress, DownloadExtras } from "@vault/types";

export interface YtDlpManagerOptions {
  binaryPath: string;
  ffmpegPath: string;
}

export class YtDlpManager {
  constructor(private readonly opts: YtDlpManagerOptions) {}

  /**
   * Probe formats/info for a given URL
   */
  async probeFormats(url: string): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const args = ["--dump-json", "--flat-playlist", url];
      const proc = spawn(this.opts.binaryPath, args, { shell: false });

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
      "--newline"
    ];

    // Add extras
    if (extras?.cookiesFromBrowser) {
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
      args.push("--embed-thumbnail");
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

    const proc = spawn(this.opts.binaryPath, args, { shell: false });

    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      const lines = chunk.toString().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const progress = JSON.parse(line);
          onProgress?.(progress);
        } catch {
          // Ignore non-JSON lines
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
          reject(new Error(`yt-dlp download failed (code ${code}): ${stderr}`));
        }
      });
      proc.on("error", (err) => {
        reject(err);
      });
    });

    return { process: proc, promise };
  }
}
