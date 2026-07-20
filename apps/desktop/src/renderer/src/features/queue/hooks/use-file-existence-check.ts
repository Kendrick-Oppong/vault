import { useState } from "react";
import { filesApi } from "@/lib/api/files";

export interface FileExistenceCheckOptions {
  downloadPath: string;
  titles: string[];
  mediaType: "video" | "music";
}

const VIDEO_EXTENSIONS = new Set(["mp4", "mkv", "webm", "mov", "avi"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "opus", "flac", "wav", "ogg"]);

/**
 * Normalise a title or filename stem the same way yt-dlp does before writing
 * to disk: strip characters that are forbidden in Windows filenames, collapse
 * runs of whitespace, and lowercase for case-insensitive comparison.
 */
function normalise(text: string): string {
  // yt-dlp strips characters \x00 through \x1f
  // eslint-disable-next-line no-control-regex -- intentional: matches yt-dlp's own filename sanitisation
  const forbiddenChars = new RegExp('[<>:"/\\\\|?*\\x00-\\x1f]', "g");
  return text.replace(forbiddenChars, "").replace(/\s+/g, " ").trim().toLowerCase();
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
    const stemWithoutQuality = stem.replace(/\s*\[([^\]]+)\]$/, "").trim();

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
