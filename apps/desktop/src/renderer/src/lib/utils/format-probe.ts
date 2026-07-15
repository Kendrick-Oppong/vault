import type {
  FormatModalData,
  VideoFormat,
  AudioFormat
} from "@/features/modals/format-modal/types";

/**
 * Resolution label from yt-dlp format width/height
 */
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

/**
 * Seconds → "HH:MM:SS" or "MM:SS"
 */
function formatDuration(seconds?: number): string | undefined {
  if (!seconds) return undefined;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Bytes → human readable approximate size string
 */
function approxSize(bytes?: number): { size: string; sizeBytes: number } {
  if (!bytes) return { size: "Unknown", sizeBytes: 0 };
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return { size: `~${gb.toFixed(2)} GB`, sizeBytes: bytes };
  const mb = bytes / (1024 * 1024);
  return { size: `~${Math.round(mb)} MB`, sizeBytes: bytes };
}

type RawFormat = Record<string, unknown>;

/**
 * Map the raw yt-dlp probe result for a single video into FormatModalData.
 * yt-dlp `--dump-json --flat-playlist` returns one JSON object per line.
 * For a single video URL, it returns exactly one object.
 */
export function mapProbeToFormatModalData(
  raw: RawFormat[],
  linkType: FormatModalData["type"]
): FormatModalData {
  // For playlists/channels, the first entry describes the container
  const entry = raw[0] ?? {};

  const title = String(entry["title"] ?? "Unknown title");
  const channel = String(entry["channel"] ?? entry["uploader"] ?? "Unknown channel");
  const thumbnail =
    (entry["thumbnail"] as string | undefined) ??
    (entry["thumbnails"] as Array<{ url: string }> | undefined)?.[0]?.url;
  const durationSecs =
    typeof entry["duration"] === "number" ? (entry["duration"] as number) : undefined;

  if (linkType === "playlist") {
    const items = raw
      .filter((e) => e["_type"] !== "playlist")
      .map((e) => ({
        id: String(e["id"] ?? ""),
        title: String(e["title"] ?? "Untitled"),
        url: String(e["url"] ?? e["webpage_url"] ?? ""),
        thumbnail:
          (e["thumbnails"] as Array<{ url: string }> | undefined)?.[0]?.url ??
          (e["thumbnail"] as string | undefined),
        duration: formatDuration(typeof e["duration"] === "number" ? e["duration"] : undefined)
      }));

    const selectedCount = items.length;
    const totalCount =
      typeof entry["playlist_count"] === "number"
        ? (entry["playlist_count"] as number)
        : items.length;

    return {
      title,
      channel,
      thumbnail,
      type: "playlist",
      videoCount: totalCount,
      playlistItems: items,
      selectedCount,
      totalCount,
      // Playlists don't have individual format lists at probe time — use defaults
      videoFormats: defaultVideoFormats(),
      audioFormats: defaultAudioFormats()
    };
  }

  // Single video: parse actual format list
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
  // Keep only video-bearing formats (vcodec present and not "none")
  const videoOnly = rawFormats.filter(
    (f) => f["vcodec"] && f["vcodec"] !== "none" && f["height"] && f["ext"] !== "mhtml"
  );

  // Group by height, take best quality per height
  const byHeight = new Map<number, RawFormat>();
  for (const f of videoOnly) {
    const h = f["height"] as number;
    const existing = byHeight.get(h);
    const tbr = (f["tbr"] as number | undefined) ?? 0;
    const existingTbr = (existing?.["tbr"] as number | undefined) ?? 0;
    if (!existing || tbr > existingTbr) {
      byHeight.set(h, f);
    }
  }

  return [...byHeight.entries()]
    .sort(([a], [b]) => b - a)
    .map(([height, f]) => {
      const fps = Math.round((f["fps"] as number | undefined) ?? 30);
      const { size, sizeBytes } = approxSize(
        (f["filesize"] as number | undefined) ?? (f["filesize_approx"] as number | undefined)
      );
      const codec = String(f["vcodec"] ?? "MP4")
        .split(".")[0]
        .toUpperCase();
      const label = resolutionLabel(height);

      return {
        label,
        resolution: label,
        fps: [fps],
        codec,
        size,
        sizeBytes
      };
    });
}

function buildAudioFormats(rawFormats: RawFormat[]): AudioFormat[] {
  // Audio-only formats
  const audioOnly = rawFormats.filter(
    (f) => (f["vcodec"] === "none" || !f["vcodec"]) && f["acodec"] && f["acodec"] !== "none"
  );

  // Deduplicate by codec, keep best bitrate
  const byCodec = new Map<string, RawFormat>();
  for (const f of audioOnly) {
    const codec = String(f["acodec"] ?? "")
      .split(".")[0]
      .toUpperCase();
    const abr = (f["abr"] as number | undefined) ?? 0;
    const existingAbr = (byCodec.get(codec)?.["abr"] as number | undefined) ?? 0;
    if (!byCodec.has(codec) || abr > existingAbr) {
      byCodec.set(codec, f);
    }
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
    const abr = f["abr"] as number | undefined;
    const { size, sizeBytes } = approxSize(
      (f["filesize"] as number | undefined) ?? (f["filesize_approx"] as number | undefined)
    );
    const lossless = codec === "FLAC" || codec === "WAV";
    const bitrate = lossless
      ? codec === "FLAC"
        ? "Lossless"
        : "Uncompressed"
      : abr
        ? `${Math.round(abr)} kbps`
        : "Unknown";
    const label = codec === "M4A" ? "AAC" : codec;

    return { label, codec, bitrate, size, sizeBytes, lossless };
  });
}

/** Fallback formats shown when probe doesn't return detailed format data (playlists, channels) */
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
