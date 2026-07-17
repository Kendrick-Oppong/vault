import type { FormatModalData, VideoFormat } from "@/features/modals/format-modal/types";
import { PRESETS } from "@vault/types";
import { formatDuration } from "@/lib/utils/format";

function str(val: unknown, fallback: string): string {
  return typeof val === "string" ? val : fallback;
}

function num(val: unknown): number | undefined {
  return typeof val === "number" ? val : undefined;
}

type RawFormat = Record<string, unknown>;

function buildVideoFormats(rawFormats: RawFormat[]): VideoFormat[] {
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
        filesize: num(f["filesize"]) ?? num(f["filesize_approx"]) ?? 0,
        tbr: num(f["tbr"]) ?? 0
      };
    });
}

function mapProbeToFormatModalData(
  raw: RawFormat[],
  linkType: FormatModalData["type"]
): FormatModalData {
  const entry = raw[0] ?? {};

  const title = str(entry["title"], "Unknown title");
  const channel = str(entry["channel"], str(entry["uploader"], "Unknown channel"));
  const thumbnail =
    (entry["thumbnail"] as string | undefined) ??
    (entry["thumbnails"] as Array<{ url: string }> | undefined)?.[0]?.url;
  const durationSecs = num(entry["duration"]);

  const rawFormats = (entry["formats"] as RawFormat[] | undefined) ?? [];
  const videoFormats = buildVideoFormats(rawFormats);

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
    thumbnail,
    type: "video",
    duration: formatDuration(durationSecs),
    videoPresets: PRESETS.filter((p) => p.mediaType === "video"),
    audioPresets: PRESETS.filter((p) => p.mediaType === "audio"),
    videoFormats
  };
}

export function formatProbeToModalData(raw: RawFormat[]): FormatModalData {
  const first = raw[0] ?? {};
  const linkType: FormatModalData["type"] =
    first["_type"] === "playlist" || Array.isArray(first["entries"]) || raw.length > 1
      ? "playlist"
      : "video";
  return mapProbeToFormatModalData(raw, linkType);
}
