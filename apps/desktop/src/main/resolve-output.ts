import { existsSync, readdirSync, statSync, lstatSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { logger } from "./logger";

const VIDEO_EXTS = new Set(["mp4", "mkv", "webm", "mov", "m4v", "avi", "flv", "ts"]);
const AUDIO_EXTS = new Set(["mp3", "m4a", "flac", "wav", "opus", "ogg", "aac", "weba"]);
const MEDIA_EXTS = new Set([...VIDEO_EXTS, ...AUDIO_EXTS]);

/**
 * Regex that matches yt-dlp intermediate file suffixes.
 * Covers ALL known format-id shapes:
 *   .f251.webm            (YouTube numeric itag)
 *   .f298.mp4             (YouTube numeric itag)
 *   .fhls-943.mp4         (Twitter/X HLS)
 *   .fhls-audio-128000-Audio.mp4  (Twitter/X HLS audio)
 *   .fdash-xxx.mp4        (DASH)
 *   .f137.140.mp4         (multi-format merge intermediate)
 */
const FORMAT_SUFFIX_RE = /\.f[\w-]+(?:\.[^.]+)?$/i;
const IS_INTERMEDIATE_RE = /\.f[\w-]+\.[^.]+$/i;

export interface Candidate {
  full: string;
  ext: string;
  mtimeMs: number;
  size: number;
}

/**
 * Strip yt-dlp temp suffixes, format-id suffixes, and the file extension
 * to produce a "title stem".
 *
 * Handles:
 *  - .part / .ytdl temp extensions
 *  - .f<format_id> intermediate suffixes (numeric AND alphanumeric: .f251, .fhls-943)
 *  - Final file extensions (.mp4, .webm, etc.)
 *
 * The extension strip only removes short alphanumeric suffixes (1-10 chars)
 * to avoid eating periods that are part of the title (e.g. "Kato Feat. Jon").
 */
export function toStem(fileName: string): string {
  return fileName
    .replace(/\.(part|ytdl)$/i, "")
    .replace(FORMAT_SUFFIX_RE, "")
    .replace(/\.[a-zA-Z0-9]{1,10}$/, "");
}

/**
 * Normalise a stem for fuzzy comparison.
 * Uses Unicode NFD decomposition so accented characters (é→e) and
 * multi-codepoint emoji are handled consistently, then strips everything
 * that isn't a-z or 0-9.
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
 * Intermediate yt-dlp files (.f<id>.<ext>) are excluded from the index.
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
    if (IS_INTERMEDIATE_RE.test(name)) continue;

    const stem = toStem(name);
    if (!stem) continue;

    const full = join(dir, name);
    let mtimeMs = 0;
    let size = 0;
    try {
      const st = statSync(full);
      if (!st.isFile()) continue;
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
 *  2. Fuzzy — normalised stem equality (handles emoji, accents, punctuation).
 *  3. Prefix — one normalised stem is a prefix of the other (handles truncation).
 *     Only triggers when the shorter stem is ≥ 80% of the longer one.
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

  const target = normalizeStem(stem);
  if (!target) {
    logger.debug(`[resolve-output] Empty normalised stem for "${stem}", skipping`);
    return null;
  }

  // 2) Fuzzy normalised equality
  for (const [candidateStem, candidates] of index) {
    if (normalizeStem(candidateStem) === target) {
      logger.debug(
        `[resolve-output] Fuzzy stem match for "${stem}" → ${candidates.length} candidate(s)`
      );
      return sortCandidates(candidates, mediaType)[0];
    }
  }

  // 3) Prefix match — handles yt-dlp truncating very long titles differently
  //    between the progress filename and the final output filename.
  let bestPrefixMatch: { candidates: Candidate[]; score: number } | null = null;
  for (const [candidateStem, candidates] of index) {
    const normalized = normalizeStem(candidateStem);
    if (!normalized) continue;

    const isPrefix = normalized.startsWith(target) || target.startsWith(normalized);
    if (isPrefix) {
      const shorter = Math.min(normalized.length, target.length);
      const longer = Math.max(normalized.length, target.length);
      const score = shorter / longer;
      // Require ≥80% overlap to avoid false positives like "My Video" matching "My Video 2"
      if (score >= 0.8 && (!bestPrefixMatch || score > bestPrefixMatch.score)) {
        bestPrefixMatch = { candidates, score };
      }
    }
  }

  if (bestPrefixMatch) {
    logger.debug(
      `[resolve-output] Prefix stem match for "${stem}" (score: ${bestPrefixMatch.score.toFixed(2)}) → ${bestPrefixMatch.candidates.length} candidate(s)`
    );
    return sortCandidates(bestPrefixMatch.candidates, mediaType)[0];
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

  // If it's a directory, don't attempt media resolution
  try {
    if (existsSync(expectedPath) && lstatSync(expectedPath).isDirectory()) {
      logger.debug(`[resolve-output] Path is a directory, returning as-is: "${expectedPath}"`);
      return expectedPath;
    }
  } catch {
    // stat failed — continue with normal flow
  }

  const currentExt = extname(expectedPath).slice(1).toLowerCase();

  // Fast path: file exists, is a media file, and is NOT an intermediate yt-dlp file
  if (opts.preferExisting && existsSync(expectedPath) && MEDIA_EXTS.has(currentExt)) {
    const baseName = basename(expectedPath);
    if (!IS_INTERMEDIATE_RE.test(baseName)) {
      logger.debug(
        `[resolve-output] preferExisting hit: "${expectedPath}" exists, returning as-is`
      );
      return expectedPath;
    }
    // It's an intermediate file that still exists — fall through to stem resolution
    logger.debug(
      `[resolve-output] preferExisting skipped: "${baseName}" is an intermediate file, resolving`
    );
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

  if (index.size === 0) {
    logger.warn(
      `[resolve-output] No media files found in "${dir}" — cannot resolve "${basename(expectedPath)}"`
    );
    return expectedPath;
  }

  const pick = pickCandidate(index, stem, mediaType);

  if (pick) {
    logger.debug(`[resolve-output] Resolved "${basename(expectedPath)}" → "${pick.full}"`);
    return pick.full;
  }

  logger.warn(`[resolve-output] Could NOT resolve "${expectedPath}" — returning original path`);
  return expectedPath;
}
