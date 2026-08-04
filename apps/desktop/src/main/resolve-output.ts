import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { logger } from "./logger";

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
 * Strip yt-dlp temp suffixes, format-id suffixes (.f137 / .f137.mp4) and the
 * file extension to produce a "title stem".
 *
 * IMPORTANT: The final extension strip only removes short alphanumeric suffixes
 * (real file extensions like .mp4, .webm, .mp3). This prevents titles that
 * contain periods from being truncated.
 */
export function toStem(fileName: string): string {
  return fileName
    .replace(/\.(part|ytdl)$/i, "")
    .replace(/\.f\d+(?:\.[^.]+)?$/i, "")
    .replace(/\.[a-zA-Z0-9]{1,10}$/, "");
}

/** Normalise a stem for fuzzy comparison: lowercase, alphanumerics only. */
export function normalizeStem(stem: string): string {
  return stem.toLowerCase().replace(/[^a-z0-9]/g, "");
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
    if (!MEDIA_EXTS.has(ext)) continue;
    if (/\.f\d+\.[^.]+$/i.test(name)) continue;
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
 *
 * Match order:
 *  1. Exact stem hit.
 *  2. Fuzzy — normalised stem comparison (case / punctuation insensitive).
 */
export function pickCandidate(
  index: Map<string, Candidate[]>,
  stem: string,
  mediaType?: string | null
): Candidate | null {
  // 1) Exact stem
  const exact = index.get(stem);
  if (exact && exact.length > 0) {
    logger.debug(`[resolve-output] Exact stem match for "${stem}" → ${exact.length} candidate(s)`);
    return sortCandidates(exact, mediaType)[0];
  }

  // 2) Fuzzy normalised stem scan
  const target = normalizeStem(stem);
  if (!target) {
    logger.debug(`[resolve-output] Empty normalised stem for "${stem}", skipping fuzzy match`);
    return null;
  }

  let fuzzy: Candidate[] = [];
  for (const [candidateStem, candidates] of index) {
    if (normalizeStem(candidateStem) === target) {
      fuzzy = candidates;
      break;
    }
  }
  if (fuzzy.length > 0) {
    logger.debug(`[resolve-output] Fuzzy stem match for "${stem}" → ${fuzzy.length} candidate(s)`);
    return sortCandidates(fuzzy, mediaType)[0];
  }

  logger.debug(`[resolve-output] No match found for stem "${stem}" (normalised: "${target}")`);
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
  if (!expectedPath) {
    logger.debug("[resolve-output] Empty expectedPath, returning as-is");
    return expectedPath;
  }

  const currentExt = extname(expectedPath).slice(1).toLowerCase();
  if (opts.preferExisting && existsSync(expectedPath) && MEDIA_EXTS.has(currentExt)) {
    logger.debug(`[resolve-output] preferExisting hit: "${expectedPath}" exists, returning as-is`);
    return expectedPath;
  }

  const dir = dirname(expectedPath);
  const stem = toStem(basename(expectedPath));
  if (!stem) {
    logger.debug(`[resolve-output] Empty stem from "${basename(expectedPath)}", returning as-is`);
    return expectedPath;
  }

  logger.debug(
    `[resolve-output] Resolving: input="${expectedPath}" dir="${dir}" stem="${stem}" mediaType=${mediaType ?? "null"}`
  );

  const index = buildStemIndex(dir);
  logger.debug(`[resolve-output] Stem index built: ${index.size} unique stem(s) in "${dir}"`);

  const pick = pickCandidate(index, stem, mediaType);

  if (pick) {
    logger.debug(`[resolve-output] Resolved "${basename(expectedPath)}" → "${pick.full}"`);
    return pick.full;
  }

  logger.warn(`[resolve-output] Could NOT resolve "${expectedPath}" — returning original path`);
  return expectedPath;
}
