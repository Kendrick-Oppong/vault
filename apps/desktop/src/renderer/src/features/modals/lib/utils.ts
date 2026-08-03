/** Extract the height in pixels from a resolution string like "1920x1080" or "1080p". */
export function extractHeight(resolution: string): number {
  const xMatch = /(\d{1,5})x(\d{1,5})/.exec(resolution);
  if (xMatch) return Number.parseInt(xMatch[2], 10);
  const pMatch = /(\d{1,5})p/.exec(resolution);
  return pMatch ? Number.parseInt(pMatch[1], 10) : 0;
}

/**
 * Parse a duration string ("HH:MM:SS", "D:HH:MM:SS", "MM:SS") into seconds.
 * Returns null if the string is missing or contains invalid parts.
 */
export function parseDurationSeconds(duration?: string): number | null {
  if (!duration) return null;
  const parts = duration.split(":").map((part) => Number.parseFloat(part));
  if (parts.some((part) => Number.isNaN(part))) return null;

  if (parts.length === 4) {
    const [d, h, m, s] = parts;
    return d * 86400 + h * 3600 + m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  return null;
}
