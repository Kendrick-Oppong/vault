import type { MediaPlatform } from "@vault/types";
import type { PlaylistItem } from "../types";

export interface NormalizedFormat {
  formatId: string;
  resolution: string;
  height: number | null;
  fps: number | null;
  ext: string;
  filesize: number | null;
  tbr: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  /** True when yt-dlp returned a downloadable format with no codec/height info
   *  (direct files, some clips). These are still valid downloads. */
  unclassified: boolean;
}

export interface NormalizedSource {
  url: string;
  // Identity — badge/icon only, never feature gating.
  platform: MediaPlatform;
  /** The real yt-dlp extractor (e.g. "Dailymotion", "TwitchClips", "Generic"). */
  extractorKey: string;

  title: string;
  channel: string;
  thumbnail?: string;
  /** null when the source doesn't report a duration (direct files, embeds). */
  durationSeconds: number | null;
  /** Live / in-progress broadcast: no fixed size, can't trim. */
  isLive: boolean;

  isPlaylist: boolean;
  playlistItems?: PlaylistItem[];
  totalCount?: number;

  videoFormats: NormalizedFormat[]; // has a video track
  audioFormats: NormalizedFormat[]; // audio-only
  otherFormats: NormalizedFormat[]; // unclassified but downloadable
  /** Total number of formats yt-dlp returned. */
  formatCount: number;

  subtitleCount: number;
  hasChapters: boolean;
}

type RawFormat = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Best-effort height: the `height` field, else parsed from `resolution`. */
function detectHeight(f: RawFormat): number | null {
  const direct = num(f["height"]);
  if (direct != null) return direct;
  const res = str(f["resolution"]);
  const x = /(\d{2,5})x(\d{2,5})/.exec(res);
  if (x) return Number.parseInt(x[2], 10);
  const p = /(\d{2,5})p\b/.exec(res);
  if (p) return Number.parseInt(p[1], 10);
  return null;
}

function estimateFilesize(f: RawFormat, durationSeconds: number | null): number | null {
  const explicit = num(f["filesize"]) ?? num(f["filesize_approx"]);
  if (explicit != null && explicit > 0) return explicit;
  const tbr = num(f["tbr"]);
  if (tbr != null && tbr > 0 && durationSeconds != null && durationSeconds > 0) {
    return Math.round((tbr * 1000 * durationSeconds) / 8);
  }
  return null;
}

function classifyFormat(f: RawFormat, durationSeconds: number | null): NormalizedFormat {
  const vcodec = str(f["vcodec"]);
  const acodec = str(f["acodec"]);
  const height = detectHeight(f);

  const hasVideo = (vcodec !== "" && vcodec !== "none") || height != null;
  const hasAudio = acodec !== "" && acodec !== "none";
  const unclassified = !hasVideo && !hasAudio;

  const width = num(f["width"]);
  const resolution =
    width != null && height != null ? `${width}x${height}` : str(f["resolution"]) || "";

  return {
    formatId: str(f["format_id"]),
    resolution,
    height,
    fps: num(f["fps"]),
    ext: str(f["ext"]) || "mp4",
    filesize: estimateFilesize(f, durationSeconds),
    tbr: num(f["tbr"]),
    hasVideo,
    hasAudio,
    unclassified
  };
}

function platformFromProbe(raw: RawFormat[], url?: string): MediaPlatform {
  const extractor =
    str(raw[0]?.["extractor_key"]).toLowerCase() || str(raw[0]?.["extractor"]).toLowerCase();
  if (extractor.includes("youtube")) return "youtube";
  if (extractor.includes("twitter") || extractor.includes("x.com")) return "twitter";
  if (extractor.includes("tiktok")) return "tiktok";
  if (extractor.includes("instagram")) return "instagram";
  if (url) {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      if (host.includes("youtube.") || host === "youtu.be") return "youtube";
      if (host === "x.com" || host.endsWith(".x.com") || host.endsWith("twitter.com"))
        return "twitter";
      if (host.endsWith("tiktok.com")) return "tiktok";
      if (host.endsWith("instagram.com")) return "instagram";
    } catch {
      /* ignore */
    }
  }
  return "generic";
}

/**
 * Adapter: raw yt-dlp probe -> NormalizedSource.
 * Best-effort classification that NEVER drops a format: anything yt-dlp returns
 * is captured as video, audio, or (when unclassifiable) `otherFormats`.
 */
export function normalizeSource(raw: RawFormat[], url = ""): NormalizedSource {
  const first = raw[0] ?? {};
  const extractorKey = str(first["extractor_key"]) || str(first["extractor"]) || "Generic";
  const platform = platformFromProbe(raw, url);

  const nestedEntries = Array.isArray(first["entries"]) ? (first["entries"] as RawFormat[]) : null;
  const isPlaylist =
    str(first["_type"]) === "playlist" ||
    (nestedEntries ? nestedEntries.length > 0 : raw.length > 1);

  const title = str(first["title"]) || "Unknown title";
  const channel = str(first["uploader"]) || str(first["channel"]) || "";
  const thumbnail =
    str(first["thumbnail"]) ||
    (first["thumbnails"] as Array<{ url?: string }> | undefined)?.find((t) => t?.url)?.url;
  const durationSeconds = num(first["duration"]);
  const isLive = first["is_live"] === true || str(first["live_status"]) === "is_live";

  const rawFormats = (first["formats"] as RawFormat[] | undefined) ?? [];
  const video: NormalizedFormat[] = [];
  const audio: NormalizedFormat[] = [];
  const other: NormalizedFormat[] = [];

  for (const f of rawFormats) {
    const nf = classifyFormat(f, durationSeconds);
    if (nf.unclassified) other.push(nf);
    else if (nf.hasVideo) video.push(nf);
    else audio.push(nf);
  }

  video.sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

  const subtitles = first["subtitles"] as Record<string, unknown> | undefined;
  const autoCaptions = first["automatic_captions"] as Record<string, unknown> | undefined;
  const subtitleCount =
    Object.keys(subtitles ?? {}).length + Object.keys(autoCaptions ?? {}).length;
  const chapters = first["chapters"];
  const hasChapters = Array.isArray(chapters) && chapters.length > 0;

  const playlistItems: PlaylistItem[] | undefined = isPlaylist
    ? raw
        .filter((e) => str(e["_type"]) !== "playlist")
        .filter((e) => str(e["url"]) || str(e["webpage_url"]))
        .map((e) => ({
          id: str(e["id"]),
          title: str(e["title"]) || "Untitled",
          url: str(e["url"]) || str(e["webpage_url"]),
          thumbnail:
            ((e["thumbnails"] as Array<{ url?: string }> | undefined)?.[0]?.url ??
              str(e["thumbnail"])) ||
            undefined,
          duration: undefined
        }))
    : undefined;

  return {
    url,
    platform,
    extractorKey,
    title,
    channel,
    thumbnail: thumbnail || undefined,
    durationSeconds,
    isLive,
    isPlaylist,
    playlistItems,
    totalCount: isPlaylist
      ? (num(first["playlist_count"]) ?? playlistItems?.length ?? 0)
      : undefined,
    videoFormats: video,
    audioFormats: audio,
    otherFormats: other,
    formatCount: rawFormats.length,
    subtitleCount,
    hasChapters
  };
}
