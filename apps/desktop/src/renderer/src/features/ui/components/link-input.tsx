import { useState } from "react";
import { Input } from "@vault/ui/components/input";
import { Link2 } from "lucide-react";
import { CommandMenu } from "./command-menu";
import { Button } from "@vault/ui/components/button";
import { Kbd } from "@vault/ui/components/kbd";
import { getModifierKey } from "@/lib/utils/platform";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { mapProbeToFormatModalData } from "@/lib/utils/format-probe";
import { toast } from "sonner";
import { useProbeFormatsMutation, useQueueDownload } from "@/lib/mutations/downloads";
import type { FormatModalData } from "@/features/modals/format-modal/types";
import type { DownloadExtras } from "@vault/types";

const defaultLoadingData: FormatModalData = {
  title: "Loading...",
  channel: "",
  type: "video",
  videoFormats: [],
  audioFormats: []
};

export const LinkInput = () => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const { openFormatModal, updateFormatModal, closeFormatModal } = useModalActions();
  const settings = useSettingsStore(selectSettings);
  const queueDownload = useQueueDownload();
  const probeMutation = useProbeFormatsMutation();

  const detectUrlType = (input: string): "playlist" | "video" => {
    // If it explicitly has a list parameter, treat it as a playlist (covers /playlist?list= and /watch?v=...&list=...)
    if (/[?&]list=/.test(input)) return "playlist";
    // Channel formats: /@username, /c/name, /user/name, /channel/id — yt-dlp returns a flat list, treat as playlist
    if (/(youtube\.com|youtu\.be)\/(shorts\/)?(@|c\/|user\/|channel\/)/i.test(input))
      return "playlist";
    // Otherwise it's a video (covers /watch?v=, /shorts/, and youtu.be/)
    return "video";
  };

  const handleProbe = (targetUrl: string) => {
    // Open modal instantly in loading state
    openFormatModal(defaultLoadingData, { isLoading: true });

    probeMutation.mutate(targetUrl, {
      onSuccess: (rawFormats) => {
        try {
          const linkType = detectUrlType(targetUrl);
          const data = mapProbeToFormatModalData(rawFormats, linkType);

          updateFormatModal({
            data,
            isLoading: false,
            isError: false,
            onConfirm: (options) => {
              let formatSelector = "bestvideo+bestaudio/best";
              if (options.videoFormat?.formatId && options.audioFormat?.formatId) {
                formatSelector = `${options.videoFormat.formatId}+${options.audioFormat.formatId}`;
              } else if (options.videoFormat?.formatId) {
                formatSelector = options.videoFormat.formatId;
              } else if (options.audioFormat?.formatId) {
                formatSelector = options.audioFormat.formatId;
              }

              // Read settings at click time (not probe time) to avoid stale closure
              const currentSettings = useSettingsStore.getState().settings;

              const extraPayload: DownloadExtras = {
                embedThumbnail: options.embedThumbnail,
                embedMetadata: options.embedMetadata,
                subtitles: options.subtitles === "none" ? undefined : options.subtitles,
                // Cookies file is automatically injected by the backend if browser cookies are configured
                rateLimit: currentSettings.bandwidthLimit || undefined,
                proxy: currentSettings.proxy || undefined,
                geoBypass: currentSettings.geoBypass || undefined
              };

              // Derive mediaType and quality from format selection
              const mediaType: "video" | "music" =
                options.mediaType === "audio" ? "music" : "video";
              const quality =
                options.videoFormat?.resolution || options.audioFormat?.label || undefined;

              // Generate output template: prioritize user settings, fallback to default
              let outputTemplate = settings.outputTemplate || "%(title)s.%(ext)s";

              // Combine with destination folder path
              const destinationFolder = options.destination;
              if (!outputTemplate.includes("/") && !outputTemplate.includes("\\")) {
                // Template is just filename pattern, append to destination folder
                const separator = destinationFolder.endsWith("/") || destinationFolder.endsWith("\\") ? "" : "/";
                outputTemplate = `${destinationFolder}${separator}${outputTemplate}`;
              }

              if (linkType === "playlist" && options.selectedItems && data.playlistItems) {
                const selectedSet = new Set(options.selectedItems);
                const itemsToQueue = data.playlistItems.filter((item) => selectedSet.has(item.id));

                for (const item of itemsToQueue) {
                  const itemUrl = item.url || targetUrl;

                  queueDownload.mutate({
                    url: itemUrl,
                    outputTemplate,
                    formatSelector,
                    extra: extraPayload,
                    meta: {
                      videoId: item.id,
                      title: item.title,
                      channel: data.channel,
                      thumbnailUrl: item.thumbnail,
                      mediaType,
                      quality
                    }
                  });
                }
              } else {
                // Single video
                queueDownload.mutate({
                  url: targetUrl,
                  outputTemplate,
                  formatSelector,
                  extra: extraPayload,
                  meta: {
                    title: data.title,
                    channel: data.channel,
                    thumbnailUrl: data.thumbnail,
                    mediaType,
                    quality
                  }
                });
              }

              closeFormatModal();
              setUrl("");
            }
          });
        } catch (err) {
          console.error("Format parsing error:", err);
          updateFormatModal({
            isLoading: false,
            isError: true,
            error: "Failed to parse video information. The format might be unsupported.",
            onRetry: () => handleProbe(targetUrl)
          });
        }
      },
      onError: (error) => {
        updateFormatModal({
          isLoading: false,
          isError: true,
          error: error instanceof Error ? error.message : "Failed to fetch video information.",
          onRetry: () => handleProbe(targetUrl)
        });
      }
    });
  };

  const handleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !url.trim() || probeMutation.isPending) return;

    // Basic guard against obvious direct image/file links
    if (/\.(jpg|jpeg|png|gif|webp|pdf|zip)$/i.test(url.trim())) {
      toast.error("Please enter a valid video or playlist URL");
      return;
    }

    handleProbe(url.trim());
  };

  return (
    <div className="relative flex-1">
      <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="url-input"
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleSubmit}
        placeholder="Paste a YouTube video, playlist, or shorts URL"
        disabled={probeMutation.isPending}
        className="h-11 w-full shadow-card border-border-strong bg-secondary/30 pl-10 pr-16 text-sm focus-visible:bg-card"
      />
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Open command menu"
        className="absolute w-16! right-2.5 top-1/2 size-6 -translate-y-1/2 rounded-md border-border/60 bg-background/40 font-mono text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        disabled={probeMutation.isPending}
      >
        <div className="flex items-center">
          <Kbd className="bg-transparent">{getModifierKey()}</Kbd>
          <Kbd className="bg-transparent">K</Kbd>
        </div>
      </Button>

      <CommandMenu open={open} onOpenChange={setOpen} />
    </div>
  );
};
