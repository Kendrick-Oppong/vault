/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string {
  try {
    const urlObj = new URL(url);

    // youtube.com/watch?v=...
    if (urlObj.hostname === "www.youtube.com" || urlObj.hostname === "youtube.com") {
      return urlObj.searchParams.get("v") || "";
    }

    // youtu.be/<id> — first path segment
    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.split("/")[1] ?? "";
    }

    // youtube.com/shorts/<id> and youtube.com/embed/<id> — second path segment
    if (urlObj.pathname.startsWith("/shorts/") || urlObj.pathname.startsWith("/embed/")) {
      return urlObj.pathname.split("/")[2] ?? "";
    }
  } catch {
    // If URL parsing fails, fall back to regex
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/
    );
    return match?.[1] || "";
  }

  return "";
}

/**
 * Check if URL is a YouTube video URL
 */
export function isYouTubeVideoUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/.test(url);
}

/**
 * Check if URL is a playlist URL
 */
export function isPlaylistUrl(url: string): boolean {
  return (
    /[?&]list=/.test(url) || /(youtube\.com|youtu\.be)\/(channel|playlist|user|c|@)\//.test(url)
  );
}
