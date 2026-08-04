import type { MediaPlatform } from "@vault/types";
import type { NormalizedSource } from "./source-model";

/**
 * What the format modal is allowed to offer for a given source.
 */
export interface SourceCapabilities {
  // ---- Identity (display only) ----
  extractorKey: string;
  /** Human-friendly site label derived from yt-dlp's extractor_key. */
  extractorLabel: string;

  // ---- Feature gating ----
  platform: MediaPlatform;
  isYouTube: boolean;

  // ---- Structure ----
  isPlaylist: boolean;
  /** Live stream: no fixed size, can't trim. */
  isLive: boolean;
  /** Only audio available (e.g. SoundCloud, a direct .mp3) → audio-first UI. */
  isAudioOnlySource: boolean;
  /** Exactly one format (e.g. a raw .mp4/.mp3) → slim fast-path card. */
  isDirectFile: boolean;

  // ---- Features ----
  /** 2+ distinct video heights → show the quality picker. */
  canSelectVideoQuality: boolean;
  /** yt-dlp can extract audio from this source. */
  canDownloadAudioOnly: boolean;
  /** Known duration, not live, not a playlist → trimming is possible. */
  canTrim: boolean;
  /** Enough info to estimate the final file size. */
  canEstimateSize: boolean;
  hasSubtitles: boolean;
  hasChapters: boolean;
  /** SponsorBlock only exists for YouTube. */
  supportsSponsorBlock: boolean;
}

/** Extensions that mark a file as audio (used to classify unclassified formats). */
const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "opus", "flac", "wav", "aac", "ogg", "oga", "wma"]);

/**
 * Tiny branding overrides. NOT a site directory — this stays small forever.
 * Keys are extractor_key lowercased with non-alphanumerics stripped.
 */
const EXTRACTOR_LABEL_OVERRIDES: Record<string, string> = {
  youtube: "YouTube",
  youtubetab: "YouTube",
  twitter: "X / Twitter",
  soundcloud: "SoundCloud",
  bilibili: "Bilibili",
  twitchclips: "Twitch Clip",
  twitch: "Twitch"
};

/** Extractors that aren't a real branded site → fall back to hostname / "Media". */
const GENERIC_EXTRACTOR_KEYS = new Set([
  "generic",
  "html5mediaembed",
  "commonmistakes",
  "playlist"
]);

function hostnameFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Derive a display label from yt-dlp's own extractor_key so it scales to every
 * supported site without us maintaining a list. A tiny override map handles
 * branding; catch-all extractors fall back to the URL hostname.
 */
function labelForExtractor(extractorKey: string, url: string): string {
  const raw = (extractorKey || "").trim();
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, "");

  const override = EXTRACTOR_LABEL_OVERRIDES[normalized];
  if (override) return override;

  if (!raw || GENERIC_EXTRACTOR_KEYS.has(normalized)) {
    return hostnameFromUrl(url) || "Media";
  }

  // extractor_key is already PascalCase for most sites (Rumble, Vimeo, …).
  const cleaned = raw.replace(/[:_-]+/g, " ").trim();
  if (!cleaned) return hostnameFromUrl(url) || "Media";
  if (cleaned.length > 32) return hostnameFromUrl(url) || "Media";
  return cleaned;
}

/**
 * Derive everything the modal needs from a NormalizedSource.
 * YouTube gets trusted overrides for features we know work; every other site is
 * inferred from what the probe actually returned.
 */
export function deriveCapabilities(source: NormalizedSource): SourceCapabilities {
  const isYouTube = source.platform === "youtube";

  // Quality picker only makes sense with 2+ distinct video heights.
  const distinctHeights = new Set(
    source.videoFormats.map((f) => f.height).filter((h): h is number => h != null && h > 0)
  );
  const canSelectVideoQuality = distinctHeights.size >= 2;

  // Audio-only detection, including unclassified single files with an audio ext.
  const hasClassifiedVideo = source.videoFormats.length > 0;
  const unclassifiedAreAudio =
    source.otherFormats.length > 0 &&
    source.otherFormats.every((f) => AUDIO_EXTENSIONS.has(f.ext.toLowerCase()));
  const hasAnyAudio = source.audioFormats.length > 0 || unclassifiedAreAudio;
  const isAudioOnlySource = !hasClassifiedVideo && hasAnyAudio;

  // Direct single-file (raw media link) → fast-path card.
  const isDirectFile = source.formatCount === 1;

  // Size estimation: explicit filesize, or bitrate × duration.
  const allFormats = [...source.videoFormats, ...source.audioFormats, ...source.otherFormats];
  const hasFilesize = allFormats.some((f) => f.filesize != null && f.filesize > 0);
  const hasTbr = allFormats.some((f) => f.tbr != null && f.tbr > 0);
  const hasDuration = source.durationSeconds != null && source.durationSeconds > 0;
  const canEstimateSize = hasFilesize || (hasTbr && hasDuration);

  return {
    extractorKey: source.extractorKey,
    extractorLabel: labelForExtractor(source.extractorKey, source.url),

    platform: source.platform,
    isYouTube,

    isPlaylist: source.isPlaylist,
    isLive: source.isLive,
    isAudioOnlySource,
    isDirectFile,

    canSelectVideoQuality,
    canDownloadAudioOnly: source.formatCount > 0,
    canTrim: hasDuration && !source.isLive && !source.isPlaylist,
    canEstimateSize,
    hasSubtitles: source.subtitleCount > 0 || isYouTube,
    hasChapters: source.hasChapters || isYouTube,
    supportsSponsorBlock: isYouTube
  };
}
