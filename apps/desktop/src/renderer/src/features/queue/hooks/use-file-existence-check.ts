import { useState } from "react";
import { filesApi } from "@/lib/api/files";

export interface FileExistenceCheckOptions {
  downloadPath: string;
  titles: string[];
  mediaType: "video" | "music";
}

const VIDEO_EXTENSIONS = new Set(["mp4", "mkv", "webm", "mov", "avi"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "opus", "flac", "wav", "ogg"]);

// yt-dlp strips characters \x00 through \x1f from filenames on write.
// eslint-disable-next-line no-control-regex -- intentional: matches yt-dlp's own filename sanitisation
const FORBIDDEN_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

// Matches a trailing quality label like " [1080p]". Both quantifiers are
// bounded to keep worst-case matching linear rather than backtracking
// across the full string on non-matching input.
const QUALITY_SUFFIX = /\s{0,10}\[([^\]]{1,200})\]$/;

/**
 * Normalise a title or filename stem the same way yt-dlp does before writing
 * to disk: strip characters that are forbidden in Windows filenames, collapse
 * runs of whitespace, and lowercase for case-insensitive comparison.
 */
function normalise(text: string): string {
  return text.replace(FORBIDDEN_CHARS, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function doesTitleExist(title: string, files: string[], allowedExts: Set<string>): boolean {
  const normalisedTitle = normalise(title);

  for (const filename of files) {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot === -1) continue;

    const stem = filename.slice(0, lastDot);
    const ext = filename.slice(lastDot + 1).toLowerCase();

    if (!allowedExts.has(ext)) continue;

    // The stem may include a quality label: "My Video [1080p]" or just "My Video".
    // Strip it for the title comparison so we match regardless of quality suffix.
    const stemWithoutQuality = stem.replace(QUALITY_SUFFIX, "").trim();

    if (normalise(stemWithoutQuality) === normalisedTitle) {
      return true;
    }
  }
  return false;
}

export const useFileExistenceCheck = () => {
  const [existingTitles, setExistingTitles] = useState<string[]>([]);

  const checkFilesExist = async (options: FileExistenceCheckOptions): Promise<string[]> => {
    const { downloadPath, titles, mediaType } = options;

    if (!downloadPath || !titles || titles.length === 0) {
      setExistingTitles([]);
      return [];
    }

    try {
      // Scan the actual download directory
      const files: string[] = await filesApi.scanDir(downloadPath);

      const allowedExts = mediaType === "music" ? AUDIO_EXTENSIONS : VIDEO_EXTENSIONS;
      const foundTitles: string[] = [];

      for (const title of titles) {
        if (doesTitleExist(title, files, allowedExts)) {
          foundTitles.push(title);
        }
      }

      setExistingTitles(foundTitles);
      return foundTitles;
    } catch (error) {
      console.error("Error scanning download directory:", error);
      setExistingTitles([]);
      return [];
    }
  };

  const clearCheck = () => {
    setExistingTitles([]);
  };

  return {
    existingTitles,
    checkFilesExist,
    clearCheck
  };
};
