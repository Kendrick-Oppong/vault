import type {
  FormatModalData,
  VideoFormat,
  AudioFormat
} from "@/features/modals/format-modal/types";
import { formatDuration } from "@/lib/utils/format";

function resolutionLabel(height?: number): string {
  if (!height) return "Unknown";
  if (height >= 4320) return "8K";
  if (height >= 2160) return "4K";
  if (height >= 1440) return "1440p";
  if (height >= 1080) return "1080p";
  if (height >= 720) return "720p";
  if (height >= 480) return "480p";
  if (height >= 360) return "360p";
  return `${height}p`;
}

function approxSize(bytes?: number): { size: string; sizeBytes: number } {
  if (!bytes) return { size: "Unknown", sizeBytes: 0 };
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return { size: `~${gb.toFixed(2)} GB`, sizeBytes: bytes };
  const mb = bytes / (1024 * 1024);
  return { size: `~${Math.round(mb)} MB`, sizeBytes: bytes };
}

function str(val: unknown, fallback: string): string {
  return typeof val === "string" ? val : fallback;
}

function num(val: unknown): number | undefined {
  return typeof val === "number" ? val : undefined;
}

type RawFormat = Record<string, unknown>;

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

  if (linkType === "playlist") {
    const items = raw
      .filter((e) => e["_type"] !== "playlist")
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
      title,
      channel,
      thumbnail,
      type: "playlist",
      videoCount: totalCount,
      playlistItems: items,
      selectedCount: items.length,
      totalCount,
      videoFormats: defaultVideoFormats(),
      audioFormats: defaultAudioFormats()
    };
  }

  const rawFormats = (entry["formats"] as RawFormat[] | undefined) ?? [];
  const videoFormats = buildVideoFormats(rawFormats);
  const audioFormats = buildAudioFormats(rawFormats);

  return {
    title,
    channel,
    thumbnail,
    type: "video",
    duration: formatDuration(durationSecs),
    videoFormats: videoFormats.length ? videoFormats : defaultVideoFormats(),
    audioFormats: audioFormats.length ? audioFormats : defaultAudioFormats()
  };
}

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
      const fps = Math.round(num(f["fps"]) ?? 30);
      const { size, sizeBytes } = approxSize(num(f["filesize"]) ?? num(f["filesize_approx"]));
      const codec = str(f["vcodec"], "MP4").split(".")[0].toUpperCase();
      const label = resolutionLabel(height);
      return { label, resolution: label, fps: [fps], codec, size, sizeBytes };
    });
}

function buildAudioFormats(rawFormats: RawFormat[]): AudioFormat[] {
  const audioOnly = rawFormats.filter(
    (f) =>
      (f["vcodec"] === "none" ||
        f["vcodec"] === undefined ||
        f["vcodec"] === null ||
        f["vcodec"] === "") &&
      f["acodec"] &&
      f["acodec"] !== "none"
  );

  const byCodec = new Map<string, RawFormat>();
  for (const f of audioOnly) {
    const codec = str(f["acodec"], "").split(".")[0].toUpperCase();
    const abr = num(f["abr"]) ?? 0;
    const existingAbr = num(byCodec.get(codec)?.["abr"]) ?? 0;
    if (!byCodec.has(codec) || abr > existingAbr) byCodec.set(codec, f);
  }

  const CODEC_ORDER = ["FLAC", "WAV", "OPUS", "MP4A", "M4A", "MP3", "AAC"];
  const sorted = [...byCodec.entries()].sort(([a], [b]) => {
    const ai = CODEC_ORDER.indexOf(a);
    const bi = CODEC_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return sorted.map(([codec, f]) => {
    const abr = num(f["abr"]);
    const { size, sizeBytes } = approxSize(num(f["filesize"]) ?? num(f["filesize_approx"]));
    const lossless = codec === "FLAC" || codec === "WAV";
    let bitrate: string;
    if (lossless) {
      bitrate = codec === "FLAC" ? "Lossless" : "Uncompressed";
    } else {
      bitrate = abr !== undefined ? `${Math.round(abr)} kbps` : "Unknown";
    }
    const label = codec === "M4A" ? "AAC" : codec;
    return { label, codec, bitrate, size, sizeBytes, lossless };
  });
}

function defaultVideoFormats(): VideoFormat[] {
  return [
    { label: "4K", resolution: "4K", fps: [60, 30], codec: "MP4", size: "Varies", sizeBytes: 0 },
    {
      label: "1080p",
      resolution: "1080p",
      fps: [60, 30],
      codec: "MP4",
      size: "Varies",
      sizeBytes: 0
    },
    { label: "720p", resolution: "720p", fps: [30], codec: "MP4", size: "Varies", sizeBytes: 0 },
    { label: "480p", resolution: "480p", fps: [30], codec: "MP4", size: "Varies", sizeBytes: 0 }
  ];
}

function defaultAudioFormats(): AudioFormat[] {
  return [
    {
      label: "FLAC",
      codec: "FLAC",
      bitrate: "Lossless",
      size: "Varies",
      sizeBytes: 0,
      lossless: true
    },
    { label: "MP3", codec: "MP3", bitrate: "320 kbps", size: "Varies", sizeBytes: 0 },
    { label: "AAC", codec: "AAC", bitrate: "256 kbps", size: "Varies", sizeBytes: 0 },
    { label: "OPUS", codec: "OPUS", bitrate: "160 kbps", size: "Varies", sizeBytes: 0 }
  ];
}

export function formatProbeToModalData(raw: RawFormat[]): FormatModalData {
  const first = raw[0] ?? {};
  const linkType: FormatModalData["type"] =
    first["_type"] === "playlist" || Array.isArray(first["entries"]) || raw.length > 1
      ? "playlist"
      : "video";
  return mapProbeToFormatModalData(raw, linkType);
}
