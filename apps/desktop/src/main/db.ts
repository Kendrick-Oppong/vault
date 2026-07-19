import Database from "better-sqlite3";
import type { HistoryEntry } from "@vault/types";

export interface VaultDb {
  raw: Database.Database;
  addHistoryEntry: (entry: HistoryEntry) => void;
  listHistory: (limit?: number, offset?: number) => HistoryEntry[];
  deleteHistory: (jobId: string) => void;
  bulkDeleteHistory: (jobIds: string[]) => void;
  isArchived: (destinationFolder: string, videoId: string) => boolean;
  markArchived: (destinationFolder: string, videoId: string) => void;
  getCachedFormats: (url: string, ttlMs?: number) => unknown;
  setCachedFormats: (url: string, payload: unknown) => void;
  clearFormatCache: (url?: string) => void;
}

export function initDb(dbPath: string): VaultDb {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      job_id TEXT PRIMARY KEY,
      video_id TEXT,
      title TEXT,
      channel TEXT,
      url TEXT,
      file_path TEXT,
      thumbnail_url TEXT,
      status TEXT,
      media_type TEXT,
      quality TEXT,
      file_size INTEGER,
      created_at INTEGER,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS archive (
      destination_folder TEXT,
      video_id TEXT,
      downloaded_at INTEGER,
      PRIMARY KEY (destination_folder, video_id)
    );

    CREATE TABLE IF NOT EXISTS format_cache (
      url TEXT PRIMARY KEY,
      payload TEXT,
      cached_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);
  `);

  // Migration: add columns if they don't exist (for users upgrading from older schema)
  const cols = db.prepare("PRAGMA table_info(history)").all() as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has("media_type")) db.exec("ALTER TABLE history ADD COLUMN media_type TEXT");
  if (!colNames.has("quality")) db.exec("ALTER TABLE history ADD COLUMN quality TEXT");
  if (!colNames.has("file_size")) db.exec("ALTER TABLE history ADD COLUMN file_size INTEGER");

  return {
    raw: db,

    addHistoryEntry(entry) {
      db.prepare(
        `INSERT OR REPLACE INTO history
         (job_id, video_id, title, channel, url, file_path, thumbnail_url, status, media_type, quality, file_size, created_at, completed_at)
         VALUES (@job_id, @video_id, @title, @channel, @url, @file_path, @thumbnail_url, @status, @media_type, @quality, @file_size, @created_at, @completed_at)`
      ).run(entry);
    },

    listHistory(limit = 200, offset = 0) {
      return db
        .prepare("SELECT * FROM history ORDER BY created_at DESC LIMIT ? OFFSET ?")
        .all(limit, offset) as HistoryEntry[];
    },

    deleteHistory(jobId) {
      db.prepare("DELETE FROM history WHERE job_id = ?").run(jobId);
    },

    bulkDeleteHistory(jobIds) {
      if (jobIds.length === 0) return;
      const placeholders = jobIds.map(() => "?").join(", ");
      db.prepare(`DELETE FROM history WHERE job_id IN (${placeholders})`).run(...jobIds);
    },

    isArchived(destinationFolder, videoId) {
      const row = db
        .prepare("SELECT 1 FROM archive WHERE destination_folder = ? AND video_id = ?")
        .get(destinationFolder, videoId);
      return !!row;
    },

    markArchived(destinationFolder, videoId) {
      db.prepare(
        `INSERT OR IGNORE INTO archive (destination_folder, video_id, downloaded_at) VALUES (?, ?, ?)`
      ).run(destinationFolder, videoId, Date.now());
    },

    getCachedFormats(url, ttlMs = 10 * 60 * 1000) {
      const row = db
        .prepare("SELECT payload, cached_at FROM format_cache WHERE url = ?")
        .get(url) as { payload: string; cached_at: number } | undefined;
      if (!row) return null;
      if (Date.now() - row.cached_at > ttlMs) return null;
      return JSON.parse(row.payload);
    },

    setCachedFormats(url, payload) {
      db.prepare(
        `INSERT OR REPLACE INTO format_cache (url, payload, cached_at) VALUES (?, ?, ?)`
      ).run(url, JSON.stringify(payload), Date.now());
    },

    clearFormatCache(url?: string) {
      if (url) {
        db.prepare("DELETE FROM format_cache WHERE url = ?").run(url);
      } else {
        db.prepare("DELETE FROM format_cache").run();
      }
    }
  };
}
