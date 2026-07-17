import { useState } from "react";
import { Loader2, Search, Video, Download, Link2, X } from "lucide-react";
import { Input } from "@vault/ui/components/input";
import { Button } from "@vault/ui/components/button";
import { Kbd } from "@vault/ui/components/kbd";
import { toast } from "sonner";
import { useSearchState, useSearchActions } from "@/stores/search/search.selectors";
import { formatDuration, isUrl } from "@/lib/utils/format";
import { useSearchYoutubeMutation } from "@/lib/mutations/search";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { useProbeFormatsMutation, useQueueDownload } from "@/lib/mutations/downloads";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import { CommandMenu } from "@/features/ui/components/command-menu";
import { getModifierKey } from "@/lib/utils/platform";
import type { SearchResult } from "@/features/search/types";
import type { DownloadExtras, JobInput } from "@vault/types";
import { presetToFormatSelector } from "@vault/types";

const SearchResultCard = ({ result }: { result: SearchResult }) => {
  const { openFormatModal } = useModalActions();
  const probeMutation = useProbeFormatsMutation();
  const queueMutation = useQueueDownload();
  const settings = useSettingsStore(selectSettings);

  const handleDownload = () => {
    probeMutation.mutate(result.url, {
      onSuccess: (formats) => {
        const modalData = formatProbeToModalData(formats);
        openFormatModal(modalData, {
          onConfirm: (options) => {
            const formatSelector = presetToFormatSelector(options.preset, options.formatId);
            const baseJobInput = {
              outputTemplate:
                settings.outputTemplate ||
                (settings.downloadPath
                  ? `${settings.downloadPath}/%(title)s.%(ext)s`
                  : "%(title)s.%(ext)s"),
              formatSelector,
              extra: {
                embedThumbnail: options.embedThumbnail,
                embedMetadata: options.embedMetadata,
                embedChapters: options.embedChapters,
                sponsorBlock: options.sponsorBlock,
                subtitles: options.subtitles,
                subtitleLanguages: options.subtitleLanguages,
                reencodeFormat: options.reencodeFormat,
                videoContainer: options.videoContainer,
                audioFormat: options.audioFormat,
                audioBitrate: options.audioBitrate,
                proxy: settings.proxy || undefined,
                rateLimit: settings.bandwidthLimit || undefined,
                geoBypass: settings.geoBypass,
                useDownloadArchive: settings.useDownloadArchive,
                cookiesFromBrowser: (settings.cookiesFromBrowser ||
                  undefined) as DownloadExtras["cookiesFromBrowser"]
              } satisfies DownloadExtras
            };

            // If playlist with selected items, queue individual jobs
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
                  const jobInput = {
                    ...baseJobInput,
                    url: item.url,
                    meta: {
                      title: item.title,
                      channel: result.channel,
                      thumbnailUrl: item.thumbnail || undefined,
                      mediaType: options.mediaType === "audio" ? "music" : "video",
                      duration: item.duration
                    }
                  } satisfies JobInput;
                  queueMutation.mutate(jobInput);
                }
              });
            } else {
              // Single video/audio download
              const jobInput = {
                ...baseJobInput,
                url: result.url,
                meta: {
                  title: result.title,
                  channel: result.channel,
                  thumbnailUrl: result.thumbnail || undefined,
                  mediaType: options.mediaType === "audio" ? "music" : "video",
                  duration: result.duration ? formatDuration(result.duration) : undefined
                }
              } satisfies JobInput;
              queueMutation.mutate(jobInput);
            }
          }
        });
      },
      onError: () => {
        toast.error("Could not fetch format info");
      }
    });
  };

  return (
    <div className="group flex gap-3 p-3 rounded-xl border border-border bg-card hover:bg-card-hover transition-colors">
      <div className="relative shrink-0 w-32 h-18 rounded-lg overflow-hidden bg-secondary">
        {result.thumbnail ? (
          <img
            src={result.thumbnail}
            alt={result.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Video className="w-6 h-6" />
          </div>
        )}
        {result.duration && (
          <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[10px] px-1 py-0.5 rounded">
            {formatDuration(result.duration)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium truncate leading-snug">{result.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{result.channel}</p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={probeMutation.isPending}
            className="h-7 text-xs gap-1.5"
          >
            {probeMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};

export const QueueInput = () => {
  const [commandOpen, setCommandOpen] = useState(false);

  const { inputValue, results, error, hasMore, currentPage, query } = useSearchState();
  const { clearSearch, setInputValue } = useSearchActions();
  const searchMutation = useSearchYoutubeMutation();
  const { openFormatModal } = useModalActions();
  const probeMutation = useProbeFormatsMutation();
  const queueMutation = useQueueDownload();
  const settings = useSettingsStore(selectSettings);

  const busy = searchMutation.isPending || probeMutation.isPending;
  const isSearching = results.length > 0 || busy || !!error;

  const handleSearchSubmit = () => {
    const value = inputValue.trim();
    if (!value || searchMutation.isPending || probeMutation.isPending) return;

    if (/\.(jpg|jpeg|png|gif|webp|pdf|zip)$/i.test(value)) {
      toast.error("Please enter a valid video or playlist URL");
      return;
    }

    if (isUrl(value)) {
      openFormatModal(null, { isLoading: true });
      probeMutation.mutate(value, {
        onSuccess: (formats) => {
          const modalData = formatProbeToModalData(formats);
          openFormatModal(modalData, {
            isLoading: false,
            onConfirm: (options) => {
              const formatSelector = presetToFormatSelector(options.preset, options.formatId);
              const baseJobInput = {
                outputTemplate:
                  settings.outputTemplate ||
                  (settings.downloadPath
                    ? `${settings.downloadPath}/%(title)s.%(ext)s`
                    : "%(title)s.%(ext)s"),
                formatSelector,
                extra: {
                  embedThumbnail: options.embedThumbnail,
                  embedMetadata: options.embedMetadata,
                  embedChapters: options.embedChapters,
                  sponsorBlock: options.sponsorBlock,
                  subtitles: options.subtitles,
                  subtitleLanguages: options.subtitleLanguages,
                  reencodeFormat: options.reencodeFormat,
                  videoContainer: options.videoContainer,
                  audioFormat: options.audioFormat,
                  audioBitrate: options.audioBitrate,
                  proxy: settings.proxy || undefined,
                  rateLimit: settings.bandwidthLimit || undefined,
                  geoBypass: settings.geoBypass,
                  useDownloadArchive: settings.useDownloadArchive,
                  cookiesFromBrowser: (settings.cookiesFromBrowser ||
                    undefined) as DownloadExtras["cookiesFromBrowser"]
                } satisfies DownloadExtras
              };

              // If playlist with selected items, queue individual jobs
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
                    const jobInput = {
                      ...baseJobInput,
                      url: item.url,
                      meta: {
                        title: item.title,
                        channel: modalData.channel,
                        thumbnailUrl: item.thumbnail || undefined,
                        mediaType: options.mediaType === "audio" ? "music" : "video",
                        duration: item.duration
                      }
                    } satisfies JobInput;
                    queueMutation.mutate(jobInput);
                  }
                });
                setInputValue("");
              } else {
                // Single video/audio download
                const jobInput = {
                  ...baseJobInput,
                  url: value,
                  meta: {
                    title: modalData.title,
                    channel: modalData.channel,
                    thumbnailUrl: modalData.thumbnail,
                    mediaType: options.mediaType === "audio" ? "music" : "video",
                    duration: modalData.duration
                  }
                } satisfies JobInput;
                queueMutation.mutate(jobInput);
                setInputValue("");
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
      });
      return;
    }

    searchMutation.mutate({ query: value, page: 0 });
  };

  const handleLoadMore = () => {
    const nextQuery = query || inputValue.trim();
    if (!nextQuery) return;
    searchMutation.mutate({ query: nextQuery, page: currentPage + 1 });
  };

  const handleClear = () => {
    setInputValue("");
    clearSearch();
  };

  return (
    <>
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Search / URL input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {isUrl(inputValue.trim()) ? (
            <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          ) : (
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            placeholder="Paste a YouTube link or search videos…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            className="pl-10 pr-20 h-10"
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
                variant="secondary"
                onClick={() => setCommandOpen(true)}
                className="flex items-center p-1 h-5 bg-foreground/10 rounded-sm gap-0 hover:text-foreground"
              >
                <Kbd className="bg-transparent">{getModifierKey()}</Kbd>
                <Kbd className="bg-transparent">K</Kbd>
              </Button>
            )}
          </div>
        </div>
        <Button
          onClick={handleSearchSubmit}
          disabled={busy || !inputValue.trim()}
          className="h-10 px-4 gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isUrl(inputValue.trim()) ? "Download" : "Search"}
        </Button>
      </div>

      {/* Search results */}
      {isSearching && (
        <div className="space-y-2">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <>
              <p className="text-[12px] text-muted-foreground">
                {results.length} result{results.length === 1 ? "" : "s"}
              </p>
              <div className="space-y-2">
                {results.map((result) => (
                  <SearchResultCard key={result.id} result={result} />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={busy}
                    className="gap-2 text-sm"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};
