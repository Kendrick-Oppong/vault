/**
 * URL and input validation utilities for yt-dlp media downloads.
 */
import type { MediaPlatform } from "@vault/types";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  videoId?: string;
  isPlaylist?: boolean;
  isAgeRestricted?: boolean;
  platform?: MediaPlatform;
}

/**
 * Extract YouTube video ID from URL
 * Supports: youtube.com (watch, shorts, embed, v), youtu.be, youtube-nocookie.com formats
 */
export function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // youtu.be/<id> — grab the first path segment
    if (urlObj.hostname.includes("youtu.be")) {
      const id = urlObj.pathname.split("/")[1] ?? "";
      return id && isValidVideoId(id) ? id : null;
    }

    // youtube.com formats
    if (
      urlObj.hostname.includes("youtube.com") ||
      urlObj.hostname.includes("youtube-nocookie.com")
    ) {
      // /shorts/<id>, /embed/<id>, /v/<id> — the video ID is always the second path segment.
      // Using split('/')[2] is explicit about structure; avoids magic-number slice offsets.
      if (
        urlObj.pathname.startsWith("/shorts/") ||
        urlObj.pathname.startsWith("/embed/") ||
        urlObj.pathname.startsWith("/v/")
      ) {
        const id = urlObj.pathname.split("/")[2] ?? "";
        return id && isValidVideoId(id) ? id : null;
      }

      // Handle watch format with v parameter
      const id = urlObj.searchParams.get("v");
      return id && isValidVideoId(id) ? id : null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate if a string is a valid YouTube video ID (11 characters, alphanumeric + _ -)
 */
export function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

/**
 * Check if URL is a playlist
 */
export function isPlaylistUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.has("list");
  } catch {
    return false;
  }
}

/**
 * Validate if input is a valid YouTube URL
 * Returns detailed validation result
 */
export function validateYouTubeUrl(input: string): ValidationResult {
  if (!input || typeof input !== "string") {
    return {
      valid: false,
      error: "URL is required"
    };
  }

  const trimmed = input.trim();

  // Check for basic URL format
  try {
    new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: "Invalid URL format"
    };
  }

  // Check if it's a YouTube domain
  if (!isYouTubeDomain(trimmed)) {
    return {
      valid: false,
      error: "URL must be from youtube.com or youtu.be"
    };
  }

  // Extract video ID
  const videoId = extractVideoId(trimmed);
  const isPlaylist = isPlaylistUrl(trimmed);

  if (!videoId && !isPlaylist) {
    return {
      valid: false,
      error: "Could not extract video ID or playlist ID from URL"
    };
  }

  // Check for age-restricted indicators in URL (not reliable, but good hint)
  const isAgeRestricted = trimmed.includes("&t=") || trimmed.includes("?t=");

  return {
    valid: true,
    platform: "youtube",
    videoId: videoId || undefined,
    isPlaylist,
    isAgeRestricted
  };
}

export function detectMediaPlatform(input: string): MediaPlatform {
  try {
    const hostname = new URL(input.trim()).hostname.toLowerCase().replace(/^www\./, "");

    if (isYouTubeDomain(input)) return "youtube";
    if (hostname === "x.com" || hostname.endsWith(".x.com")) return "twitter";
    if (hostname === "twitter.com" || hostname.endsWith(".twitter.com")) return "twitter";
    if (hostname === "t.co" || hostname.endsWith(".t.co")) return "twitter";
    if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) return "tiktok";
    if (hostname === "vm.tiktok.com" || hostname === "vt.tiktok.com") return "tiktok";
    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) return "instagram";

    return "generic";
  } catch {
    return "generic";
  }
}

export function validateMediaUrl(input: string): ValidationResult {
  if (!input || typeof input !== "string") {
    return {
      valid: false,
      error: "URL is required"
    };
  }

  const trimmed = input.trim();
  let urlObj: URL;

  try {
    urlObj = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: "Invalid URL format"
    };
  }

  if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
    return {
      valid: false,
      error: "URL must start with http:// or https://"
    };
  }

  const platform = detectMediaPlatform(trimmed);
  if (platform === "youtube") return validateYouTubeUrl(trimmed);

  return {
    valid: true,
    platform,
    isPlaylist: false
  };
}

/**
 * Check if hostname is a known YouTube domain
 */
function isYouTubeDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    const youtubePatterns = [
      "youtube.com",
      "youtu.be",
      "youtube-nocookie.com",
      "youtube.co.uk",
      "youtube.jp",
      "youtube.fr",
      "youtube.de",
      "youtube.br",
      "youtube.in",
      "youtube.es",
      "youtube.mx",
      "youtube.it",
      "youtube.ru",
      "youtube.kr",
      "youtube.tw",
      "youtube.hk",
      "youtube.cn",
      "youtube.ca",
      "youtube.au",
      "youtube.nz",
      "youtube.com.br",
      "m.youtube.com"
    ];

    return youtubePatterns.some((pattern) => hostname.includes(pattern));
  } catch {
    return false;
  }
}

/**
 * Validate output template string
 * Ensures it contains valid placeholders for yt-dlp
 */
export function validateOutputTemplate(template: string): { valid: boolean; error?: string } {
  if (!template || typeof template !== "string") {
    return {
      valid: false,
      error: "Output template is required"
    };
  }

  // Must have at least one placeholder
  if (!template.includes("%(title)s") && !template.includes("%(id)s")) {
    return {
      valid: false,
      error: "Output template must contain at least %(title)s or %(id)s"
    };
  }

  // Check for invalid characters in path (platform-specific)
  // Windows: exclude <>":|?* but allow : in drive letters (e.g., C:)
  // Allow backslashes as path separators, but not other special chars used in filenames
  const hasPathPrefix = /^[A-Za-z]:/.test(template);
  const platform = process.platform as NodeJS.Platform | "win32";

  if (platform === "win32") {
    // Check for genuinely invalid chars (excluding those that are path-safe: \/:.)
    const invalidChars = /[<>"|?*]/;
    if (invalidChars.test(template)) {
      return {
        valid: false,
        error: 'Output template contains invalid characters: < > " | ? *'
      };
    }
    // Allow colons only in drive letter prefix (e.g., C:)
    const colonIndices = [...template.matchAll(/:/g)].map((m) => m.index);
    for (const idx of colonIndices) {
      if (idx !== 1 || !hasPathPrefix) {
        return {
          valid: false,
          error: "Output template can only contain colons in drive letters (e.g., C:)"
        };
      }
    }
  }
  // Unix / Linux / macOS: reject only null characters
  else if (/\0/.test(template)) {
    return {
      valid: false,
      error: "Output template contains invalid null characters"
    };
  }

  return { valid: true };
}

/**
 * Validate format selector string (used for yt-dlp --format parameter)
 */
export function validateFormatSelector(selector: string): { valid: boolean; error?: string } {
  if (!selector || typeof selector !== "string") {
    return {
      valid: false,
      error: "Format selector is required"
    };
  }

  // Basic format selector validation
  // Allow common patterns: numbers, +, -, /, brackets, quotes, colons, equals, less than, greater than
  if (!/^[a-z0-9\s+\-/[\](),'"|&:=<>]*$/i.test(selector)) {
    return {
      valid: false,
      error: "Format selector contains invalid characters"
    };
  }

  return { valid: true };
}
