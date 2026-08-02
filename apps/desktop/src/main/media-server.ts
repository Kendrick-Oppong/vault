// apps/desktop/src/main/media-server.ts
import http from "node:http";
import fs from "node:fs";
import crypto from "node:crypto";
import { extname } from "node:path";
import { logger } from "./logger";

const mimeMap: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
  ".wav": "audio/wav",
  ".opus": "audio/opus",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac"
};

// Extensions we're willing to stream.
const SERVABLE_EXTS = new Set(Object.keys(mimeMap));

function guessMimeType(filePath: string): string {
  return mimeMap[extname(filePath).toLowerCase()] || "application/octet-stream";
}

let server: http.Server | null = null;
let port = 0;
const token = crypto.randomBytes(16).toString("hex");

export function buildMediaUrl(filePath: string): string {
  return `http://127.0.0.1:${port}/media?path=${encodeURIComponent(filePath)}&token=${token}`;
}

export function startMediaServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? "", `http://127.0.0.1:${port}`);

        if (url.pathname !== "/media") {
          res.writeHead(404).end();
          return;
        }

        if (url.searchParams.get("token") !== token) {
          res.writeHead(403).end();
          return;
        }

        const filePath = url.searchParams.get("path");
        if (!filePath) {
          res.writeHead(400).end();
          return;
        }

        // Only stream known media extensions — reject everything else before
        // touching the filesystem.
        if (!SERVABLE_EXTS.has(extname(filePath).toLowerCase())) {
          res.writeHead(403).end();
          return;
        }

        let stat: fs.Stats;
        try {
          stat = await fs.promises.stat(filePath);
        } catch {
          res.writeHead(404).end();
          return;
        }

        if (!stat.isFile()) {
          res.writeHead(404).end();
          return;
        }

        const fileSize = stat.size;
        const mimeType = guessMimeType(filePath);
        const range = req.headers.range;

        // ── Full response (no Range header) ──
        if (!range) {
          res.writeHead(200, {
            "Content-Type": mimeType,
            "Content-Length": fileSize,
            "Accept-Ranges": "bytes"
          });
          const stream = fs.createReadStream(filePath);
          stream.pipe(res);
          req.on("close", () => stream.destroy());
          stream.on("error", () => {
            if (!res.headersSent) res.writeHead(500);
            res.end();
          });
          return;
        }

        // ── Partial response (Range header) ──
        const match = /bytes=(\d*)-(\d*)/.exec(range);
        let start = match?.[1] ? Number.parseInt(match[1], 10) : 0;
        let end = match?.[2] ? Number.parseInt(match[2], 10) : fileSize - 1;

        if (Number.isNaN(start) || start < 0) start = 0;
        if (Number.isNaN(end) || end >= fileSize) end = fileSize - 1;

        if (start > end) {
          res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
          res.end();
          return;
        }

        const chunkSize = end - start + 1;
        res.writeHead(206, {
          "Content-Type": mimeType,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": chunkSize,
          "Accept-Ranges": "bytes"
        });

        const stream = fs.createReadStream(filePath, { start, end });
        stream.pipe(res);
        req.on("close", () => stream.destroy());
        stream.on("error", () => {
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
      } catch {
        if (!res.headersSent) res.writeHead(500);
        res.end();
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server?.address();
      if (address && typeof address === "object") {
        port = address.port;
        logger.info(`[media-server] listening on 127.0.0.1:${port}`);
        resolve();
      } else {
        reject(new Error("Failed to determine media server port"));
      }
    });

    server.on("error", reject);
  });
}

export function stopMediaServer(): void {
  server?.close();
  server = null;
}
