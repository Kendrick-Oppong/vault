import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useModalStore } from "@/stores/ui/modal.store";
import { useProbeFormatsMutation } from "@/lib/mutations/downloads";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { ClipboardToastContent } from "../components/clipboard-toast";
import type { FormatOptions } from "@/features/modals/format-modal/types";
import type { DownloadExtras, JobInput } from "@vault/types";
import { presetToFormatSelector } from "@vault/types";

const MAX_RECENT_URLS = 50;

export const useClipboardDetection = () => {
  const probeMutation = useProbeFormatsMutation();
  const settings = useSettingsStore(selectSettings);

  // Dedup so the same copied URL doesn't re-trigger repeatedly
  const recentUrlsRef = useRef<Set<string>>(new Set());

  // Keep a live ref to settings without touching it during render
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Keep a live ref to the probe mutate fn. The parent `probeMutation` object
  // is recreated by react-query on every state change, so we must NOT put it
  // in the main effect's deps — only the stable `.mutate` goes in the ref.
  const probeMutateRef = useRef(probeMutation.mutate);
  useEffect(() => {
    probeMutateRef.current = probeMutation.mutate;
  }, [probeMutation.mutate]);

  /**
   * Called when the user clicks "Queue" on the clipboard toast.
   * Re-probes the URL with the FULL playlist limit (the toast probe used
   * limit:1 only to fetch the title quickly) so playlists show every item,
   * then opens the format modal and wires up the confirm → queue flow.
   */
  const handleQueue = useCallback((url: string) => {
    const { openFormatModal } = useModalStore.getState();
    const currentSettings = settingsRef.current;

    openFormatModal(null, { isLoading: true });

    probeMutateRef.current(
      { url, playlistLimit: currentSettings.playlistFetchLimit },
      {
        onSuccess: (formats) => {
          const modalData = formatProbeToModalData(formats, url);

          openFormatModal(modalData, {
            isLoading: false,
            onConfirm: (options: FormatOptions) => {
              const formatSelector = presetToFormatSelector(options.preset, options.formatId);
              const qualitySuffix =
                options.mediaType === "video" && currentSettings.useDownloadArchive
                  ? ` [${options.preset.label}]`
                  : "";
              const outputTemplate = currentSettings.outputTemplate
                ? currentSettings.outputTemplate.replace(/%(title)s/, `%(title)s${qualitySuffix}`)
                : `%(title)s${qualitySuffix}.%(ext)s`;

              const baseJobInput = {
                outputTemplate,
                downloadPath: options.destination || currentSettings.downloadPath || undefined,
                formatSelector,
                extra: {
                  embedThumbnail: options.embedThumbnail,
                  embedMetadata: options.embedMetadata,
                  embedChapters: options.embedChapters,
                  sponsorBlock: options.sponsorBlock,
                  subtitles: options.subtitles,
                  subtitleLanguages: options.subtitleLanguages,
                  videoContainer: options.videoContainer,
                  audioFormat:
                    options.mediaType === "audio" ? options.preset.audioFormat : undefined,
                  audioBitrate: options.audioBitrate,
                  proxy: currentSettings.proxy || undefined,
                  rateLimit: currentSettings.bandwidthLimit || undefined,
                  geoBypass: currentSettings.geoBypass,
                  useDownloadArchive: currentSettings.useDownloadArchive,
                  trimRange: options.trimRange,
                  frameAccurate: options.frameAccurate,
                  cookiesFromBrowser: (currentSettings.cookiesFromBrowser ||
                    undefined) as DownloadExtras["cookiesFromBrowser"]
                } satisfies DownloadExtras
              };

              const newJobs: JobInput[] = [];

              if (
                modalData.type === "playlist" &&
                options.selectedItems &&
                options.selectedItems.length > 0
              ) {
                const selectedPlaylistItems = modalData.playlistItems?.filter((item) =>
                  options.selectedItems?.includes(item.id)
                );

                selectedPlaylistItems?.forEach((item) => {
                  if (item.url) {
                    newJobs.push({
                      ...baseJobInput,
                      url: item.url,
                      meta: {
                        title: item.title,
                        platform: modalData.platform,
                        channel: modalData.channel,
                        thumbnailUrl: item.thumbnail || undefined,
                        mediaType: options.mediaType === "audio" ? "music" : "video",
                        duration: item.duration,
                        quality: options.preset.label
                      }
                    } satisfies JobInput);
                  }
                });
              } else {
                newJobs.push({
                  ...baseJobInput,
                  url,
                  meta: {
                    title: modalData.title,
                    platform: modalData.platform,
                    channel: modalData.channel,
                    thumbnailUrl: modalData.thumbnail,
                    mediaType: options.mediaType === "audio" ? "music" : "video",
                    duration: modalData.duration,
                    quality: options.preset.label
                  }
                } satisfies JobInput);
              }

              if (newJobs.length === 0) return;
              newJobs.forEach((job) => globalThis.api.queueDownload(job));
            }
          });
        },
        onError: (err) => {
          openFormatModal(null, {
            isLoading: false,
            isError: true,
            error: err instanceof Error ? err.message : "Failed to fetch video information."
          });
        }
      }
    );
  }, []);

  useEffect(() => {
    if (!settings.clipboardDetection) return;

    const unsubscribe = globalThis.api.onClipboardUrlDetected((url: string) => {
      // Dedup: skip URLs we've already surfaced
      if (recentUrlsRef.current.has(url)) return;

      // Skip if the format modal is already open (user is mid-flow)
      const { formatModal } = useModalStore.getState();
      if (formatModal.isOpen) return;

      // Mark as seen immediately to prevent double-firing
      recentUrlsRef.current.add(url);
      if (recentUrlsRef.current.size > MAX_RECENT_URLS) {
        const first = recentUrlsRef.current.values().next().value;
        if (first) recentUrlsRef.current.delete(first);
      }

      // Probe with limit:1 — we only need the title for the toast.
      // The full probe happens later when the user clicks "Queue".
      probeMutateRef.current(
        { url, playlistLimit: 1 },
        {
          onSuccess: (formats) => {
            const modalData = formatProbeToModalData(formats, url);
            const title = modalData.title || url;

            toast.custom(
              (t) => (
                <ClipboardToastContent
                  title={title}
                  url={url}
                  onQueue={() => {
                    toast.dismiss(t);
                    handleQueue(url);
                  }}
                  onDismiss={() => toast.dismiss(t)}
                />
              ),
              { duration: 9000, position: "bottom-right" }
            );
          },
          onError: () => {
            // Probe failed — still show a toast with the raw URL so the user
            // can retry via the Queue button (which re-probes with full limit).
            toast.custom(
              (t) => (
                <ClipboardToastContent
                  title={url}
                  url={url}
                  onQueue={() => {
                    toast.dismiss(t);
                    handleQueue(url);
                  }}
                  onDismiss={() => toast.dismiss(t)}
                />
              ),
              { duration: 9000, position: "bottom-right" }
            );
          }
        }
      );
    });

    return () => {
      unsubscribe();
    };
  }, [settings.clipboardDetection, handleQueue]);
};
