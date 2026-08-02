import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

const VIDEO_EXTS = new Set(["mp4", "mkv", "webm", "mov", "m4v", "avi", "flv", "ts"]);
const AUDIO_EXTS = new Set(["mp3", "m4a", "flac", "wav", "opus", "ogg", "aac"]);
const MEDIA_EXTS = new Set([...VIDEO_EXTS, ...AUDIO_EXTS]);

export interface Candidate {
  full: string;
  ext: string;
  mtimeMs: number;
  size: number;
}

/** Strip yt-dlp temp suffixes, format-id suffixes (.f137 / .f137.mp4) and the extension. */
export function toStem(fileName: string): string {
  return fileName
    .replace(/\.(part|ytdl)$/i, "")
    .replace(/\.f\d+(?:\.[^.]+)?$/i, "")
    .replace(/\.[^.]+$/, "");
}

/**
 * Read a directory once and group every real media file by its title stem.
 * Part files (`.f137.mp4`, `.part`, …) and non-media sidecars are ignored.
 */
export function buildStemIndex(dir: string): Map<string, Candidate[]> {
  const index = new Map<string, Candidate[]>();
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return index;
  }

  for (const name of entries) {
    const ext = extname(name).slice(1).toLowerCase();
    if (!MEDIA_EXTS.has(ext)) continue; // ignore thumbs, subtitles, .info.json, etc.
    if (/\.f\d+\.[^.]+$/i.test(name)) continue; // ignore leftover per-stream part files
    const stem = toStem(name);
    if (!stem) continue;

    const full = join(dir, name);
    let mtimeMs = 0;
    let size = 0;
    try {
      const st = statSync(full);
      mtimeMs = st.mtimeMs;
      size = st.size;
    } catch {
      /* ignore unreadable entries */
    }

    const list = index.get(stem);
    if (list) list.push({ full, ext, mtimeMs, size });
    else index.set(stem, [{ full, ext, mtimeMs, size }]);
  }

  return index;
}

/** Pick the best candidate for a stem, preferring the expected media type, then newest, then largest. */
export function pickCandidate(
  index: Map<string, Candidate[]>,
  stem: string,
  mediaType?: string | null
): Candidate | null {
  const list = index.get(stem);
  if (!list || list.length === 0) return null;

  const preferred =
    mediaType === "music" ? AUDIO_EXTS : mediaType === "video" ? VIDEO_EXTS : MEDIA_EXTS;

  const sorted = [...list].sort((a, b) => {
    const ap = preferred.has(a.ext) ? 1 : 0;
    const bp = preferred.has(b.ext) ? 1 : 0;
    if (ap !== bp) return bp - ap; // preferred media type first
    if (b.mtimeMs !== a.mtimeMs) return b.mtimeMs - a.mtimeMs; // newest first
    return b.size - a.size; // largest first
  });

  return sorted[0];
}

export interface ResolveOptions {
  /** If true and the path already exists as a media file, return it unchanged. */
  preferExisting?: boolean;
}

/**
 * Resolve the real, final output file for a yt-dlp job.
 *
 * yt-dlp reports intermediate filenames (e.g. `Title.f137.mp4`, `Title.f140.m4a`)
 * and may change the container extension during merging/extraction, so the path
 * captured during download frequently does not match the file on disk. This scans
 * the destination directory for the newest real media file sharing the same stem.
 */
export function resolveActualOutputPath(
  expectedPath: string,
  mediaType?: string | null,
  opts: ResolveOptions = {}
): string {
  if (!expectedPath) return expectedPath;

  const currentExt = extname(expectedPath).slice(1).toLowerCase();
  if (opts.preferExisting && existsSync(expectedPath) && MEDIA_EXTS.has(currentExt)) {
    return expectedPath;
  }

  const dir = dirname(expectedPath);
  const stem = toStem(basename(expectedPath));
  if (!stem) return expectedPath;

  const pick = pickCandidate(buildStemIndex(dir), stem, mediaType);
  return pick ? pick.full : expectedPath;
}
