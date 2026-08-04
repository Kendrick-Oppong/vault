/** Format seconds into H:MM:SS or M:SS */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const wholeSeconds = Math.round(seconds);
  const h = Math.floor(wholeSeconds / 3600);
  const m = Math.floor((wholeSeconds % 3600) / 60);
  const s = wholeSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Parse "HH:MM:SS", "H:MM:SS", "MM:SS", or "M:SS" into total seconds. Returns 0 on invalid input. */
export function parseDurationToSeconds(duration?: string): number {
  if (!duration) return 0;
  const parts = duration.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  return parts[0] || 0;
}

/** Returns true if the value looks like a URL (http/https or youtube shorthand) */
export function isUrl(value: string): boolean {
  return (
    /^https?:\/\/[a-zA-Z0-9][\w.-]*\.[a-zA-Z]{2,}(\/[^\s]*)?$/i.test(value) ||
    /(?:youtube\.com|youtu\.be)\/\S+/i.test(value)
  );
}

/** Map codec names to valid yt-dlp audio formats */
export function mapCodecToYtdlpFormat(codec?: string): string | undefined {
  if (!codec) return undefined;
  const lowerCodec = codec.toLowerCase();
  // yt-dlp valid formats: mp3, m4a, opus, flac, wav
  switch (lowerCodec) {
    case "aac":
    case "m4a":
    case "mp4a":
      return "m4a";
    case "mp3":
      return "mp3";
    case "opus":
      return "opus";
    case "flac":
      return "flac";
    case "wav":
      return "wav";
    default:
      return lowerCodec;
  }
}
