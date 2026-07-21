import type { FormatModalData, VideoFormat } from "@/features/modals/format-modal/types";
import { PRESETS, type MediaPlatform } from "@vault/types";
import { formatDuration } from "@/lib/utils/format";

function str(val: unknown, fallback: string): string {
  return typeof val === "string" ? val : fallback;
}

function num(val: unknown): number | undefined {
  return typeof val === "number" ? val : undefined;
}

type RawFormat = Record<string, unknown>;

function detectPlatformFromUrl(url?: string): MediaPlatform {
  if (!url) return "generic";
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (hostname.includes("youtube.") || hostname === "youtu.be") return "youtube";
    if (hostname === "x.com" || hostname.endsWith(".x.com")) return "twitter";
    if (hostname === "twitter.com" || hostname.endsWith(".twitter.com")) return "twitter";
    if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) return "tiktok";
    if (hostname === "vm.tiktok.com" || hostname === "vt.tiktok.com") return "tiktok";
    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) return "instagram";
    return "generic";
  } catch {
    return "generic";
  }
}

function detectPlatform(raw: RawFormat[], url?: string): MediaPlatform {
  const extractor = str(raw[0]?.["extractor_key"], "").toLowerCase();
  if (extractor.includes("youtube")) return "youtube";
  if (extractor.includes("twitter") || extractor.includes("x.com")) return "twitter";
  if (extractor.includes("tiktok")) return "tiktok";
  if (extractor.includes("instagram")) return "instagram";
  return detectPlatformFromUrl(url);
}

function estimateFilesize(format: RawFormat, durationSecs?: number): number | null {
  const explicitSize = num(format["filesize"]) ?? num(format["filesize_approx"]);
  if (explicitSize && explicitSize > 0) return explicitSize;

  const tbr = num(format["tbr"]);
  if (tbr && tbr > 0 && durationSecs && durationSecs > 0) {
    return Math.round((tbr * 1000 * durationSecs) / 8);
  }

  return null;
}

function buildVideoFormats(rawFormats: RawFormat[], durationSecs?: number): VideoFormat[] {
  const videoOnly = rawFormats.filter(
    (f) => f["vcodec"] && f["vcodec"] !== "none" && f["height"] && f["ext"] !== "mhtml"
  );

  const byHeight = new Map<number, RawFormat>();
  for (const f of videoOnly) {
    const h = num(f["height"]) ?? 0;
    const existing = byHeight.get(h);
    const tbr = num(f["tbr"]) ?? 0;
    const existingTbr = num(existing?.["tbr"]) ?? 0;
    if (!existing || tbr > existingTbr) byHeight.set(h, f);
  }

  return [...byHeight.entries()]
    .sort(([a], [b]) => b - a)
    .map(([height, f]) => {
      const rawResolution = str(f["resolution"], "");
      const rawWidth = num(f["width"]);
      const rawHeight = num(f["height"]);

      // Try to construct resolution from available data
      let resolution: string;
      if (rawResolution && (rawResolution.includes("x") || rawResolution.endsWith("p"))) {
        // Use raw resolution if it looks valid
        resolution = rawResolution;
      } else if (rawWidth && rawHeight) {
        // Construct from width and height
        resolution = `${rawWidth}x${rawHeight}`;
      } else if (rawHeight) {
        // Fallback to height only
        resolution = `${rawHeight}p`;
      } else {
        // Last resort
        resolution = `${height}p`;
      }

      return {
        formatId: str(f["format_id"], ""),
        resolution,
        fps: num(f["fps"]) ?? null,
        ext: str(f["ext"], "mp4"),
        filesize: estimateFilesize(f, durationSecs),
        tbr: num(f["tbr"]) ?? 0
      };
    });
}

function mapProbeToFormatModalData(
  raw: RawFormat[],
  linkType: FormatModalData["type"],
  platform: MediaPlatform
): FormatModalData {
  const entry = raw[0] ?? {};

  const title = str(entry["title"], "Unknown title");
  const channel = str(entry["channel"], str(entry["uploader"], "Unknown channel"));
  const creatorLabel =
    platform === "youtube" ? channel : str(entry["uploader"], str(entry["channel"], "Unknown creator"));
  const thumbnail =
    (entry["thumbnail"] as string | undefined) ??
    (entry["thumbnails"] as Array<{ url: string }> | undefined)?.[0]?.url;
  const durationSecs = num(entry["duration"]);

  const rawFormats = (entry["formats"] as RawFormat[] | undefined) ?? [];
  const videoFormats = buildVideoFormats(rawFormats, durationSecs);

  if (linkType === "playlist") {
    const items = raw
      .filter((e) => e["_type"] !== "playlist")
      .filter((e) => e["url"] || e["webpage_url"]) // Filter out items without URLs
      .map((e) => ({
        id: str(e["id"], ""),
        title: str(e["title"], "Untitled"),
        url: str(e["url"], str(e["webpage_url"], "")),
        thumbnail:
          (e["thumbnails"] as Array<{ url: string }> | undefined)?.[0]?.url ??
          (e["thumbnail"] as string | undefined),
        duration: formatDuration(num(e["duration"]))
      }));

    const totalCount = num(entry["playlist_count"]) ?? items.length;

    return {
      id: str(entry["id"], str(entry["webpage_url"], "")),
      title,
      channel,
      creatorLabel,
      platform,
      thumbnail,
      type: "playlist",
      videoCount: totalCount,
      playlistItems: items,
      selectedCount: items.length,
      totalCount,
      videoPresets: PRESETS.filter((p) => p.mediaType === "video"),
      audioPresets: PRESETS.filter((p) => p.mediaType === "audio"),
      videoFormats
    };
  }

  return {
    id: str(entry["id"], str(entry["webpage_url"], "")),
    title,
    channel,
    creatorLabel,
    platform,
    thumbnail,
    type: "video",
    duration: formatDuration(durationSecs),
    videoPresets: PRESETS.filter((p) => p.mediaType === "video"),
    audioPresets: PRESETS.filter((p) => p.mediaType === "audio"),
    videoFormats
  };
}

export function formatProbeToModalData(raw: RawFormat[], url?: string): FormatModalData {
  const first = raw[0] ?? {};
  const platform = detectPlatform(raw, url);
  const linkType: FormatModalData["type"] =
    first["_type"] === "playlist" || Array.isArray(first["entries"]) || raw.length > 1
      ? "playlist"
      : "video";
  const modalData = mapProbeToFormatModalData(raw, linkType, platform);
  return {
    ...modalData,
    url
  };
}
