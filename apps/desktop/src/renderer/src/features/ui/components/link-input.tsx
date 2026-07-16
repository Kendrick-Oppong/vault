import { useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@vault/ui/components/input";
import { Button } from "@vault/ui/components/button";
import { Kbd } from "@vault/ui/components/kbd";
import { PresetButtons } from "@/features/ui/components/preset-buttons";
import { CommandMenu } from "@/features/ui/components/command-menu";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { useProbeFormatsMutation, useQueueDownload } from "@/lib/mutations/downloads";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { useFormatState } from "@/stores/format/format.selectors";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import { getModifierKey } from "@/lib/utils/platform";

export const LinkInput = () => {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  const { openFormatModal } = useModalActions();
  const probeMutation = useProbeFormatsMutation();
  const queueMutation = useQueueDownload();
  const settings = useSettingsStore(selectSettings);
  const { selectedPreset, customFormat } = useFormatState();

  const handleProbe = (targetUrl: string) => {
    probeMutation.mutate(targetUrl, {
      onSuccess: (formats) => {
        const modalData = formatProbeToModalData(formats, targetUrl);
        openFormatModal(modalData, {
          onConfirm: (options) => {
            const formatSelector =
              options.mediaType === "video"
                ? options.videoFormat?.formatId || "bestvideo+bestaudio/best"
                : options.audioFormat?.formatId || "bestaudio/best";

            const jobInput = {
              url: targetUrl,
              outputTemplate: settings.downloadPath
                ? `${settings.downloadPath}/%(title)s.%(ext)s`
                : "%(title)s.%(ext)s",
              formatSelector,
              meta: {
                title: modalData.title,
                channel: modalData.channel,
                thumbnailUrl: modalData.thumbnailUrl,
                mediaType: options.mediaType,
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
                cookiesFromBrowser: settings.cookiesFromBrowser as any
              }
            };

            queueMutation.mutate(jobInput);
            setUrl("");
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
    if (e.key !== "Enter" || !url.trim() || probeMutation.isPending) return;

    // Basic guard against obvious direct image/file links
    if (/\.(jpg|jpeg|png|gif|webp|pdf|zip)$/i.test(url.trim())) {
      toast.error("Please enter a valid video or playlist URL");
      return;
    }

    handleProbe(url.trim());
  };

  return (
    <div className="space-y-2">
      {/* Preset quick-select buttons */}
      <PresetButtons />

      {/* URL input */}
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
      </div>

      <CommandMenu open={open} onOpenChange={setOpen} />
    </div>
  );
};
