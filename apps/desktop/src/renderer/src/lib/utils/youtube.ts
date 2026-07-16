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
    
    // youtu.be/...
    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1);
    }
    
    // youtube.com/shorts/...
    if (urlObj.pathname.startsWith("/shorts/")) {
      return urlObj.pathname.slice(8);
    }
  } catch {
    // If URL parsing fails, try regex
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
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
  return /[?&]list=/.test(url) || 
    /(youtube\.com|youtu\.be)\/(channel|playlist|user|c|@)\//.test(url);
}
