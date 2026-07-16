/** Format seconds into M:SS */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Returns true if the value looks like a URL (http/https or youtube shorthand) */
export function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /(?:youtube\.com|youtu\.be)\//i.test(value);
}
