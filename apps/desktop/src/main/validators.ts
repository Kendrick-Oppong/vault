/**
 * URL and input validation utilities for YouTube downloader
 * Ensures URLs are valid YouTube URLs before processing
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  videoId?: string;
  isPlaylist?: boolean;
  isAgeRestricted?: boolean;
}

/**
 * Extract YouTube video ID from URL
 * Supports: youtube.com, youtu.be, youtube-nocookie.com formats
 */
export function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // youtu.be format
    if (urlObj.hostname.includes('youtu.be')) {
      const id = urlObj.pathname.slice(1).split('?')[0];
      return id && isValidVideoId(id) ? id : null;
    }

    // youtube.com formats
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtube-nocookie.com')) {
      const id = urlObj.searchParams.get('v');
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
    return urlObj.searchParams.has('list');
  } catch {
    return false;
  }
}

/**
 * Validate if input is a valid YouTube URL
 * Returns detailed validation result
 */
export function validateYouTubeUrl(input: string): ValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      valid: false,
      error: 'URL is required'
    };
  }

  const trimmed = input.trim();

  // Check for basic URL format
  try {
    new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format'
    };
  }

  // Check if it's a YouTube domain
  if (!isYouTubeDomain(trimmed)) {
    return {
      valid: false,
      error: 'URL must be from youtube.com or youtu.be'
    };
  }

  // Extract video ID
  const videoId = extractVideoId(trimmed);
  const isPlaylist = isPlaylistUrl(trimmed);

  if (!videoId && !isPlaylist) {
    return {
      valid: false,
      error: 'Could not extract video ID or playlist ID from URL'
    };
  }

  // Check for age-restricted indicators in URL (not reliable, but good hint)
  const isAgeRestricted = trimmed.includes('&t=') || trimmed.includes('?t=');

  return {
    valid: true,
    videoId: videoId || undefined,
    isPlaylist,
    isAgeRestricted
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
      'youtube.com',
      'youtu.be',
      'youtube-nocookie.com',
      'youtube.co.uk',
      'youtube.jp',
      'youtube.fr',
      'youtube.de',
      'youtube.br',
      'youtube.in',
      'youtube.es',
      'youtube.mx',
      'youtube.it',
      'youtube.ru',
      'youtube.kr',
      'youtube.tw',
      'youtube.hk',
      'youtube.cn',
      'youtube.ca',
      'youtube.au',
      'youtube.nz',
      'youtube.com.br',
      'm.youtube.com'
    ];

    return youtubePatterns.some(pattern => hostname.includes(pattern));
  } catch {
    return false;
  }
}

/**
 * Validate output template string
 * Ensures it contains valid placeholders for yt-dlp
 */
export function validateOutputTemplate(template: string): { valid: boolean; error?: string } {
  if (!template || typeof template !== 'string') {
    return {
      valid: false,
      error: 'Output template is required'
    };
  }

  // Must have at least one placeholder
  if (!template.includes('%(title)s') && !template.includes('%(id)s')) {
    return {
      valid: false,
      error: 'Output template must contain at least %(title)s or %(id)s'
    };
  }

  // Check for invalid characters in path (platform-specific)
  const invalidChars = process.platform === 'win32' ? /[<>:"|?*]/ : /\0/;
  if (invalidChars.test(template)) {
    return {
      valid: false,
      error: `Output template contains invalid characters for ${process.platform}`
    };
  }

  return { valid: true };
}

/**
 * Validate format selector string (used for yt-dlp --format parameter)
 */
export function validateFormatSelector(selector: string): { valid: boolean; error?: string } {
  if (!selector || typeof selector !== 'string') {
    return {
      valid: false,
      error: 'Format selector is required'
    };
  }

  // Basic format selector validation
  // Allow common patterns: numbers, +, -, /, brackets, quotes
  if (!/^[a-z0-9\s\+\-\/\[\]\(\),'"|&]*$/i.test(selector)) {
    return {
      valid: false,
      error: 'Format selector contains invalid characters'
    };
  }

  return { valid: true };
}
