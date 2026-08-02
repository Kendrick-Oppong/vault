import type Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { basename, dirname } from "node:path";
import { buildStemIndex, pickCandidate, toStem, type Candidate } from "./resolve-output";
import { logger } from "./logger";

/** Shape of a row returned by `PRAGMA table_info(...)`. */
interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
}

/** Shape of a row from the `sqlite_master` table-name query. */
interface TableNameRow {
  name: string;
}

/** Columns we read from the history table. */
interface HistoryRow {
  job_id: string;
  file_path: string | null;
  media_type?: string | null;
}

export interface RepairResult {
  scanned: number;
  updated: number;
  table: string | null;
}

/**
 * One-time heal for history rows whose stored `file_path` points at a stale
 * yt-dlp intermediate name (e.g. `Title.f140.m4a`, `Title.webm`) instead of the
 * real merged file on disk (`Title.mp4`). Such rows already play at runtime via
 * the `media:getUrl` resolver, but their stored path — and therefore the format
 * label shown on the history card — stays wrong until corrected here.
 *
 * Safe & idempotent: a row is only updated when a real, existing file with the
 * same title stem is found AND it differs from the stored path.
 */
export function repairHistoryPaths(raw: Database.Database): RepairResult {
  // 1) Discover the history table by introspecting the schema (no hard-coded name).
  const tables = raw
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as TableNameRow[];

  let table: string | null = null;
  let cols = new Set<string>();

  for (const t of tables) {
    if (!/^[A-Za-z0-9_]+$/.test(t.name)) continue; // guard the pragma interpolation
    const info = raw.pragma(`table_info(${t.name})`) as ColumnInfo[];
    const names = new Set(info.map((c) => c.name));
    if (names.has("job_id") && names.has("file_path")) {
      table = t.name;
      cols = names;
      break;
    }
  }

  if (!table) {
    logger.warn("[repair-history] No history table found (needs job_id + file_path columns)");
    return { scanned: 0, updated: 0, table: null };
  }

  const hasMedia = cols.has("media_type");
  const hasSize = cols.has("file_size");

  // 2) Read every row that has a stored path.
  const selectCols = ["job_id", "file_path"];
  if (hasMedia) selectCols.push("media_type");
  const rows = raw.prepare(`SELECT ${selectCols.join(", ")} FROM ${table}`).all() as HistoryRow[];

  // 3) Build the UPDATE statement (include file_size only when the column exists).
  const setClauses = ["file_path = ?"];
  if (hasSize) setClauses.push("file_size = ?");
  const updateStmt = raw.prepare(`UPDATE ${table} SET ${setClauses.join(", ")} WHERE job_id = ?`);

  // 4) Walk rows, caching one stem-index per unique directory.
  const indexCache = new Map<string, Map<string, Candidate[]>>();
  let scanned = 0;
  let updated = 0;

  for (const row of rows) {
    const fp = row.file_path;
    if (!fp) continue;
    scanned++;

    const dir = dirname(fp);
    let idx = indexCache.get(dir);
    if (!idx) {
      idx = buildStemIndex(dir);
      indexCache.set(dir, idx);
    }

    const stem = toStem(basename(fp));
    const cand = pickCandidate(idx, stem, row.media_type ?? null);

    if (cand && cand.full !== fp && existsSync(cand.full)) {
      const params: unknown[] = [cand.full];
      if (hasSize) params.push(cand.size);
      params.push(row.job_id);
      try {
        updateStmt.run(...params);
        updated++;
      } catch (err) {
        logger.warn("[repair-history] Failed to update row", row.job_id, err);
      }
    }
  }

  return { scanned, updated, table };
}
