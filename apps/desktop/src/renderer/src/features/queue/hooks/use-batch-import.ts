import { useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useQueueDownload } from "@/lib/mutations/downloads";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { isUrl } from "@/lib/utils/format";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import type { DownloadExtras, JobInput } from "@vault/types";
import { presetToFormatSelector, PRESETS } from "@vault/types";

export type BatchMode = "video" | "audio";

export interface ParsedUrl {
  url: string;
  status: "valid" | "invalid" | "duplicate";
  selected: boolean;
}

export interface BatchConfig {
  mode: BatchMode;
  presetId: string;
  audioBitrate: number;
  subtitles: boolean;
  subtitleLanguages: string[];
  destination: string;
}

function extractUrlsFromText(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim().replace(/^["']|["']$/g, ""))
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/** Probe a single URL and return the modal data. */
async function probeUrl(url: string, playlistLimit: number) {
  const formats = await globalThis.api.probeFormats(url, playlistLimit);
  return formatProbeToModalData(formats, url);
}

/** Run probes with a concurrency limit. Returns results in order. */
async function probeWithConcurrency(
  urls: string[],
  playlistLimit: number,
  concurrency: number,
  onProgress: (done: number, total: number) => void
) {
  const results: Array<{
    url: string;
    success: boolean;
    data?: ReturnType<typeof formatProbeToModalData>;
    error?: string;
  }> = [];
  let index = 0;
  let done = 0;

  async function worker() {
    while (index < urls.length) {
      const i = index++;
      const url = urls[i];
      try {
        const data = await probeUrl(url, playlistLimit);
        results[i] = { url, success: true, data };
      } catch (err) {
        results[i] = {
          url,
          success: false,
          error: err instanceof Error ? err.message : String(err)
        };
      }
      done++;
      onProgress(done, urls.length);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export const useBatchImport = () => {
  const queueMutation = useQueueDownload();
  const settings = useSettingsStore(selectSettings);

  const [parsedUrls, setParsedUrls] = useState<ParsedUrl[]>([]);
  const [config, setConfig] = useState<BatchConfig>({
    mode: "video",
    presetId: PRESETS.find((p) => p.mediaType === "video")?.id ?? "best",
    audioBitrate: 192,
    subtitles: false,
    subtitleLanguages: settings.subtitleLangs ?? ["en"],
    destination: ""
  });
  const [isQueuing, setIsQueuing] = useState(false);
  const [probeProgress, setProbeProgress] = useState<{ done: number; total: number } | null>(null);
  const abortRef = useRef(false);

  const parseInput = useCallback((raw: string) => {
    const candidates = extractUrlsFromText(raw);

    if (candidates.length === 0) {
      toast.error("No links found", {
        description: "Paste one link per line, or import a .txt file."
      });
      return;
    }

    const seen = new Set<string>();
    const parsed: ParsedUrl[] = candidates.map((url) => {
      const valid = isUrl(url);
      const duplicate = seen.has(url);
      if (valid && !duplicate) seen.add(url);
      return {
        url,
        status: !valid ? "invalid" : duplicate ? "duplicate" : "valid",
        selected: valid && !duplicate
      };
    });

    setParsedUrls(parsed);
  }, []);

  const importFile = useCallback(async () => {
    const filePath = await globalThis.api.openFileDialog({
      title: "Import links from text file",
      filters: [{ name: "Text Files", extensions: ["txt"] }]
    });
    if (!filePath) return;

    const text = await globalThis.api.readFile(filePath);
    if (!text) {
      toast.error("Could not read file", {
        description: "Make sure the file is a plain .txt with one link per line."
      });
      return;
    }
    parseInput(text);
  }, [parseInput]);

  const toggleUrl = useCallback((url: string) => {
    setParsedUrls((prev) =>
      prev.map((p) => (p.url === url && p.status === "valid" ? { ...p, selected: !p.selected } : p))
    );
  }, []);

  const selectAll = useCallback((select: boolean) => {
    setParsedUrls((prev) =>
      prev.map((p) => (p.status === "valid" ? { ...p, selected: select } : p))
    );
  }, []);

  const clear = useCallback(() => setParsedUrls([]), []);

  const stats = useMemo(() => {
    const valid = parsedUrls.filter((p) => p.status === "valid");
    return {
      valid: valid.length,
      selected: valid.filter((p) => p.selected).length,
      invalid: parsedUrls.filter((p) => p.status === "invalid").length,
      duplicates: parsedUrls.filter((p) => p.status === "duplicate").length
    };
  }, [parsedUrls]);

  /** Build a JobInput from a URL + optional probe metadata. */
  const buildJobInput = useCallback(
    (
      url: string,
      probeMeta?: {
        title?: string;
        thumbnail?: string;
        channel?: string;
        duration?: string;
        platform?: string;
      }
    ): JobInput => {
      const isAudio = config.mode === "audio";
      const preset =
        PRESETS.find((p) => p.id === config.presetId && p.mediaType === config.mode) ??
        PRESETS.find((p) => p.mediaType === config.mode) ??
        PRESETS[0];

      const formatSelector = presetToFormatSelector(preset);
      const destination = config.destination || settings.downloadPath || undefined;

      const extra: DownloadExtras = {
        embedThumbnail: settings.embedThumbnail,
        embedMetadata: settings.embedMetadata,
        embedChapters: settings.embedChapters,
        sponsorBlock: settings.sponsorBlock,
        subtitles: config.subtitles ? "external" : "none",
        subtitleLanguages: config.subtitles ? config.subtitleLanguages : undefined,
        videoContainer: settings.videoContainer,
        audioFormat: isAudio ? preset.audioFormat : undefined,
        audioBitrate: isAudio ? config.audioBitrate : undefined,
        proxy: settings.proxy || undefined,
        rateLimit: settings.bandwidthLimit || undefined,
        geoBypass: settings.geoBypass,
        useDownloadArchive: settings.useDownloadArchive,
        cookiesFromBrowser: (settings.cookiesFromBrowser ||
          undefined) as DownloadExtras["cookiesFromBrowser"]
      };

      return {
        url,
        outputTemplate: settings.outputTemplate || "%(title)s.%(ext)s",
        formatSelector,
        downloadPath: destination,
        extra,
        meta: {
          title: probeMeta?.title,
          channel: probeMeta?.channel,
          thumbnailUrl: probeMeta?.thumbnail,
          duration: probeMeta?.duration,
          platform: probeMeta?.platform as JobInput["meta"] extends { platform?: infer P }
            ? P
            : never,
          mediaType: isAudio ? "music" : "video",
          quality: preset.label
        }
      };
    },
    [config, settings]
  );

  /**
   * Queue all selected URLs.
   * Probes every URL first to:
   * 1. Detect and expand playlists into individual items
   * 2. Get thumbnails and titles for all URLs
   * 3. Validate that URLs are actually reachable
   */
  const queueAll = useCallback(async () => {
    const toProbe = parsedUrls.filter((p) => p.status === "valid" && p.selected);
    if (toProbe.length === 0) {
      toast.error("Nothing to queue", { description: "Select at least one valid link." });
      return;
    }

    setIsQueuing(true);
    abortRef.current = false;
    setProbeProgress({ done: 0, total: toProbe.length });

    try {
      // Probe all URLs with concurrency of 5
      const results = await probeWithConcurrency(
        toProbe.map((p) => p.url),
        settings.playlistFetchLimit,
        5,
        (done, total) => setProbeProgress({ done, total })
      );

      if (abortRef.current) return;

      let queuedCount = 0;
      let failedCount = 0;

      for (const result of results) {
        if (abortRef.current) break;

        if (!result.success || !result.data) {
          failedCount++;
          continue;
        }

        const modalData = result.data;

        if (modalData.type === "playlist" && modalData.playlistItems?.length) {
          // Expand playlist into individual items
          for (const item of modalData.playlistItems) {
            if (!item.url || item.unavailable) continue;
            const job = buildJobInput(item.url, {
              title: item.title,
              thumbnail: item.thumbnail,
              duration: item.duration,
              channel: modalData.channel,
              platform: modalData.platform
            });
            queueMutation.mutate(job);
            queuedCount++;
          }
        } else {
          // Single video — queue with probe metadata (thumbnail, title, etc.)
          const job = buildJobInput(result.url, {
            title: modalData.title,
            thumbnail: modalData.thumbnail,
            channel: modalData.channel,
            duration: modalData.duration,
            platform: modalData.platform
          });
          queueMutation.mutate(job);
          queuedCount++;
        }
      }

      // Summary toast
      if (queuedCount > 0 && failedCount === 0) {
        toast.success(`Queued ${queuedCount} download${queuedCount === 1 ? "" : "s"}`);
      } else if (queuedCount > 0 && failedCount > 0) {
        toast.warning(`Queued ${queuedCount}, failed ${failedCount}`, {
          description: "Some links could not be resolved."
        });
      } else {
        toast.error("Failed to queue any downloads", {
          description: "None of the links could be resolved."
        });
      }
    } catch (err) {
      toast.error("Batch import failed", {
        description: err instanceof Error ? err.message : "Unknown error"
      });
    } finally {
      setIsQueuing(false);
      setProbeProgress(null);
      setParsedUrls([]);
    }
  }, [parsedUrls, buildJobInput, queueMutation, settings.playlistFetchLimit]);

  return {
    parsedUrls,
    config,
    stats,
    isQueuing,
    probeProgress,
    setConfig,
    parseInput,
    importFile,
    toggleUrl,
    selectAll,
    clear,
    queueAll
  };
};
