import { useState } from "react";
import { Loader2, Video, Download } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { toast } from "sonner";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { useProbeFormatsMutation, useQueueDownload } from "@/lib/mutations/downloads";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import { formatDuration } from "@/lib/utils/format";
import type { SearchResult } from "@/features/search/types";
import type { DownloadExtras, JobInput } from "@vault/types";
import { presetToFormatSelector } from "@vault/types";
import { FileOverwriteDialog } from "./file-overwrite-dialog";
import { useFileExistenceCheck } from "../hooks/use-file-existence-check";

interface SearchResultCardProps {
  result: SearchResult;
}

export const SearchResultCard = ({ result }: SearchResultCardProps) => {
  const { openFormatModal } = useModalActions();
  const probeMutation = useProbeFormatsMutation();
  const queueMutation = useQueueDownload();
  const settings = useSettingsStore(selectSettings);
  const { existingTitles, checkFilesExist, clearCheck } = useFileExistenceCheck();
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingJobs, setPendingJobs] = useState<JobInput[]>([]);

  const handleDownload = () => {
    probeMutation.mutate(
      { url: result.url, playlistLimit: settings.playlistFetchLimit },
      {
        onSuccess: (formats) => {
          const modalData = formatProbeToModalData(formats, result.url);
          openFormatModal(modalData, {
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
                        channel: result.channel,
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
                  url: result.url,
                  meta: {
                    title: result.title,
                    channel: result.channel,
                    thumbnailUrl: result.thumbnail || undefined,
                    mediaType: options.mediaType === "audio" ? "music" : "video",
                    duration: result.duration ? formatDuration(result.duration) : undefined,
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
              }
            }
          });
        },
        onError: () => {
          toast.error("Could not fetch format info");
        }
      }
    );
  };

  const handleOverwriteAll = () => {
    pendingJobs.forEach((job) =>
      queueMutation.mutate({
        ...job,
        extra: { ...job.extra, overwrite: true }
      })
    );
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

  return (
    <div className="group flex gap-3 p-3 rounded-xl border border-border bg-card hover:bg-card-hover transition-colors">
      <div className="relative shrink-0 w-32 h-18 rounded-lg overflow-hidden bg-secondary">
        {result.thumbnail ? (
          <img
            src={result.thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
            <Video className="w-8 h-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        {result.duration && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-medium text-white shadow-sm">
            {formatDuration(result.duration)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium leading-tight line-clamp-2" title={result.title}>
            {result.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 truncate" title={result.channel}>
            {result.channel}
          </p>
        </div>

        <div className="flex items-center justify-end">
          <Button
            onClick={handleDownload}
            disabled={probeMutation.isPending}
            variant="secondary"
            className="h-7 px-3 text-xs gap-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            {probeMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download
          </Button>
        </div>
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
