import { useState } from "react";
import { Loader2, Search, Link2, X } from "lucide-react";
import { Input } from "@vault/ui/components/input";
import { Button } from "@vault/ui/components/button";
import { Kbd } from "@vault/ui/components/kbd";
import { toast } from "sonner";
import { isUrl } from "@/lib/utils/format";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { useProbeFormatsMutation, useQueueDownload } from "@/lib/mutations/downloads";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import { getModifierKey } from "@/lib/utils/platform";
import type { DownloadExtras, JobInput } from "@vault/types";
import { presetToFormatSelector } from "@vault/types";
import { FileOverwriteDialog } from "./file-overwrite-dialog";
import { useFileExistenceCheck } from "../hooks/use-file-existence-check";
import { useSearchActions } from "@/stores/search/search.selectors";

interface UrlInputHandlerProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  busy: boolean;
  onSearchTrigger: (query: string) => void;
  setCommandOpen: (open: boolean) => void;
}

export const UrlInputHandler = ({
  inputValue,
  setInputValue,
  busy,
  onSearchTrigger,
  setCommandOpen
}: UrlInputHandlerProps) => {
  const { openFormatModal } = useModalActions();
  const probeMutation = useProbeFormatsMutation();
  const queueMutation = useQueueDownload();
  const settings = useSettingsStore(selectSettings);
  const { existingTitles, checkFilesExist, clearCheck } = useFileExistenceCheck();
  const { clearSearch } = useSearchActions();
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingJobs, setPendingJobs] = useState<JobInput[]>([]);

  const handleSearchSubmit = () => {
    const value = inputValue.trim();
    if (!value || busy) return;

    if (/\.(jpg|jpeg|png|gif|webp|pdf|zip)$/i.test(value)) {
      toast.error("Please enter a valid video or playlist URL");
      return;
    }

    if (isUrl(value)) {
      openFormatModal(null, { isLoading: true });
      probeMutation.mutate(
        { url: value, playlistLimit: settings.playlistFetchLimit },
        {
          onSuccess: (formats) => {
            const modalData = formatProbeToModalData(formats, value);
            openFormatModal(modalData, {
              isLoading: false,
              onConfirm: async (options) => {
                const formatSelector = presetToFormatSelector(options.preset, options.formatId);
                const qualitySuffix =
                  options.mediaType === "video" && settings.useDownloadArchive
                    ? ` [${options.preset.label}]`
                    : "";
                const outputTemplate = settings.outputTemplate
                  ? settings.outputTemplate.replace(/%(title)s/, `%(title)s${qualitySuffix}`)
                  : `%(title)s${qualitySuffix}.%(ext)s`;

                const baseJobInput = {
                  outputTemplate,
                  downloadPath: options.destination || settings.downloadPath || undefined,
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
                    proxy: settings.proxy || undefined,
                    rateLimit: settings.bandwidthLimit || undefined,
                    geoBypass: settings.geoBypass,
                    useDownloadArchive: settings.useDownloadArchive,
                    cookiesFromBrowser: (settings.cookiesFromBrowser ||
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
                    url: value,
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

                const titles = newJobs.map((j) => j.meta?.title).filter(Boolean) as string[];
                const foundTitles = await checkFilesExist({
                  downloadPath: options.destination || settings.downloadPath || "",
                  titles,
                  mediaType: options.mediaType === "audio" ? "music" : "video"
                });

                if (foundTitles.length > 0) {
                  setPendingJobs(newJobs);
                  setShowOverwriteDialog(true);
                } else {
                  newJobs.forEach((job) => queueMutation.mutate(job));
                  clearSearch();
                }
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
      return;
    }

    onSearchTrigger(value);
  };

  const handleOverwriteAll = () => {
    pendingJobs.forEach((job) =>
      queueMutation.mutate({
        ...job,
        extra: { ...job.extra, overwrite: true }
      })
    );
    clearSearch();
    setPendingJobs([]);
    setShowOverwriteDialog(false);
    clearCheck();
  };

  const handleSkipExisting = () => {
    const jobsToQueue = pendingJobs.filter(
      (job) => !existingTitles.includes(job.meta?.title || "")
    );

    if (jobsToQueue.length > 0) {
      jobsToQueue.forEach((job) => queueMutation.mutate(job));
      clearSearch();
      toast.info(
        `Queued ${jobsToQueue.length} files. Skipped ${existingTitles.length} existing files.`
      );
    } else {
      toast.info("All selected files already exist. Nothing queued.");
    }

    setPendingJobs([]);
    setShowOverwriteDialog(false);
    clearCheck();
  };

  const handleCancel = () => {
    setPendingJobs([]);
    setShowOverwriteDialog(false);
    clearCheck();
  };

  const handleClear = () => {
    setInputValue("");
  };

  return (
    <div className="relative flex-1">
      {isUrl(inputValue.trim()) ? (
        <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      ) : (
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input
        placeholder="Paste a video link or search YouTube..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
        className="pl-10 pr-24 h-10"
        disabled={busy}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {inputValue ? (
          <Button variant="ghost" size="icon" onClick={handleClear} className="h-6 w-6">
            <X className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCommandOpen(true)}
            className="flex items-center p-1 h-5 bg-foreground/10 rounded-sm gap-0 hover:text-foreground"
          >
            <Kbd className="bg-transparent">{getModifierKey()}</Kbd>
            <Kbd className="bg-transparent">K</Kbd>
          </Button>
        )}
        {isUrl(inputValue.trim()) && (
          <Button
            onClick={handleSearchSubmit}
            disabled={busy || !inputValue.trim()}
            className="h-7 px-3 gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isUrl(inputValue.trim()) ? "Download" : "Search"}
          </Button>
        )}
      </div>

      {showOverwriteDialog && existingTitles.length > 0 && pendingJobs.length > 0 && (
        <FileOverwriteDialog
          open={showOverwriteDialog}
          onOpenChange={setShowOverwriteDialog}
          existingCount={existingTitles.length}
          totalCount={pendingJobs.length}
          onOverwriteAll={handleOverwriteAll}
          onSkipExisting={handleSkipExisting}
          onCancel={handleCancel}
          singleFileTitle={existingTitles.length === 1 ? existingTitles[0] : undefined}
        />
      )}
    </div>
  );
};
