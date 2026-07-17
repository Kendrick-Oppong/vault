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
