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
