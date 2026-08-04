import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

const VIDEO_EXTS = new Set(["mp4", "mkv", "webm", "mov", "m4v", "avi", "flv", "ts"]);
const AUDIO_EXTS = new Set(["mp3", "m4a", "flac", "wav", "opus", "ogg", "aac", "weba"]);
const MEDIA_EXTS = new Set([...VIDEO_EXTS, ...AUDIO_EXTS]);

export interface Candidate {
  full: string;
  ext: string;
  mtimeMs: number;
  size: number;
}

/**
 * Strip yt-dlp temp suffixes, one-or-more format-id suffixes
 * (.f137 / .f137.mp4 / .fhls-943.mp4 / .f298.f251.mp4) and the extension.
 */
export function toStem(fileName: string): string {
  return fileName
    .replace(/\.(part|ytdl)$/i, "")
    .replace(/(\.f[\w-]+)+(\.[^.]+)?$/i, "")
    .replace(/\.[^.]+$/, "");
}

/**
 * Normalise a stem for fuzzy comparison.
 * Decomposes accented characters (Café -> Cafe), strips diacritics, lowercases,
 * then keeps only alphanumerics. Emoji / symbols / punctuation are dropped, so
 * sanitisation differences between the reported name and the on-disk name don't
 * break the match.
 */
export function normalizeStem(stem: string): string {
  return stem
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Read a directory once and group every real media file by its title stem.
 * Part files (`.f137.mp4`, `.fhls-943.mp4`, `.part`, …) and non-media sidecars
 * are ignored.
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
    if (!MEDIA_EXTS.has(ext)) continue;
    if (/(\.f[\w-]+)+\.[^.]+$/i.test(name)) continue;
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
      continue;
    }

    const list = index.get(stem);
    const cand: Candidate = { full, ext, mtimeMs, size };
    if (list) list.push(cand);
    else index.set(stem, [cand]);
  }

  return index;
}

function sortCandidates(candidates: Candidate[], mediaType?: string | null): Candidate[] {
  const preferred =
    mediaType === "music" ? AUDIO_EXTS : mediaType === "video" ? VIDEO_EXTS : MEDIA_EXTS;

  return [...candidates].sort((a, b) => {
    const ap = preferred.has(a.ext) ? 1 : 0;
    const bp = preferred.has(b.ext) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (b.mtimeMs !== a.mtimeMs) return b.mtimeMs - a.mtimeMs;
    return b.size - a.size;
  });
}

/**
 * Pick the best candidate for a stem.
 *  1. Exact stem hit.
 *  2. Fuzzy — normalised stem comparison (case / punctuation / emoji / accent insensitive).
 */
export function pickCandidate(
  index: Map<string, Candidate[]>,
  stem: string,
  mediaType?: string | null
): Candidate | null {
  const exact = index.get(stem);
  if (exact && exact.length > 0) return sortCandidates(exact, mediaType)[0];

  const target = normalizeStem(stem);
  if (!target) return null;

  let fuzzy: Candidate[] = [];
  for (const [candidateStem, candidates] of index) {
    if (normalizeStem(candidateStem) === target) {
      fuzzy = candidates;
      break;
    }
  }
  if (fuzzy.length > 0) return sortCandidates(fuzzy, mediaType)[0];

  return null;
}

export interface ResolveOptions {
  /** If true and the path already exists as a media file, return it unchanged. */
  preferExisting?: boolean;
}

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
