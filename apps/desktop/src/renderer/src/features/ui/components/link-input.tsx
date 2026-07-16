import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@vault/ui/components/input";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { useProbeFormatsMutation, useQueueDownload } from "@/lib/mutations/downloads";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { useSearchActions, useSearchState } from "@/stores/search/search.selectors";
import { useSearchYoutubeMutation } from "@/lib/mutations/search";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import { isUrl } from "@/lib/utils/format";
import type { DownloadExtras, JobInput } from "@vault/types";

export const LinkInput = () => {
  const { openFormatModal } = useModalActions();
  const probeMutation = useProbeFormatsMutation();
  const queueMutation = useQueueDownload();
  const searchMutation = useSearchYoutubeMutation();
  const settings = useSettingsStore(selectSettings);
  const { inputValue } = useSearchState();
  const { setInputValue } = useSearchActions();

  const toJobMediaType = (mediaType: "video" | "audio") =>
    mediaType === "audio" ? "music" : "video";

  const handleProbe = (targetUrl: string) => {
    probeMutation.mutate(targetUrl, {
      onSuccess: (formats) => {
        const modalData = formatProbeToModalData(formats);
        openFormatModal(modalData, {
          onConfirm: (options) => {
            const formatSelector =
              options.mediaType === "video"
                ? options.videoFormat?.formatId || "bestvideo+bestaudio/best"
                : options.audioFormat?.formatId || "bestaudio/best";

            const jobInput = {
              url: targetUrl,
              outputTemplate:
                settings.outputTemplate ||
                (settings.downloadPath
                  ? `${settings.downloadPath}/%(title)s.%(ext)s`
                  : "%(title)s.%(ext)s"),
              formatSelector,
              meta: {
                title: modalData.title,
                channel: modalData.channel,
                thumbnailUrl: modalData.thumbnail,
                mediaType: toJobMediaType(options.mediaType),
                quality: options.videoFormat?.label || options.audioFormat?.label
              },
              extra: {
                embedThumbnail: options.embedThumbnail,
                embedMetadata: options.embedMetadata,
                subtitles: options.subtitles,
                subtitleLanguages: options.subtitleLanguages,
                reencodeFormat: options.reencodeFormat,
                proxy: settings.proxy || undefined,
                rateLimit: settings.bandwidthLimit || undefined,
                geoBypass: settings.geoBypass,
                cookiesFromBrowser: (settings.cookiesFromBrowser ||
                  undefined) as DownloadExtras["cookiesFromBrowser"]
              } satisfies DownloadExtras
            } satisfies JobInput;

            queueMutation.mutate(jobInput);
            setInputValue("");
          },
          isLoading: false
        });
      },
      onError: (error) => {
        openFormatModal(null, {
          isLoading: false,
          isError: true,
          error: error instanceof Error ? error.message : "Failed to fetch video information.",
          onRetry: () => handleProbe(targetUrl)
        });
      }
    });

    // Open the modal immediately in loading state
    openFormatModal(null, {
      isLoading: true
    });
  };

  const handleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const value = inputValue.trim();
    if (e.key !== "Enter" || !value || probeMutation.isPending || searchMutation.isPending) return;

    // Basic guard against obvious direct image/file links
    if (/\.(jpg|jpeg|png|gif|webp|pdf|zip)$/i.test(value)) {
      toast.error("Please enter a valid video or playlist URL");
      return;
    }

    if (isUrl(value)) {
      handleProbe(value);
      return;
    }

    searchMutation.mutate({ query: value, page: 0 });
  };

  return (
    <div className="relative flex-1">
      <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="url-input"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleSubmit}
        placeholder="Paste a YouTube link or search videos"
        disabled={probeMutation.isPending || searchMutation.isPending}
        className="h-11 w-full shadow-card border-border-strong bg-secondary/30 pl-10 pr-4 text-sm focus-visible:bg-card"
      />
      {(probeMutation.isPending || searchMutation.isPending) && (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
};
