import { useState, useMemo, useCallback } from "react";
import { FilterTabs } from "./filter-tabs";
import { BulkActions } from "./bulk-actions";
import { QueueList } from "./queue-list";
import type { QueueFilter, QueueItem, QueueStats } from "../types";
import { useActiveJobs } from "@/lib/queries/jobs";
import {
  usePauseDownload,
  useResumeDownload,
  useRetryDownload,
  useCancelDownload,
  useProbeFormatsMutation,
  useQueueDownload
} from "@/lib/mutations/downloads";
import { Loader2, Search, Video, Download, Link2, X } from "lucide-react";
import { Input } from "@vault/ui/components/input";
import { Button } from "@vault/ui/components/button";
import { Kbd } from "@vault/ui/components/kbd";
import { toast } from "sonner";
import { useSearchState, useSearchActions } from "@/stores/search/search.selectors";
import { useSearchYoutubeMutation } from "@/lib/mutations/search";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import { formatDuration, isUrl } from "@/lib/utils/format";
import { CommandMenu } from "@/features/ui/components/command-menu";
import { getModifierKey } from "@/lib/utils/platform";
import type { SearchResult } from "@/features/search/types";
import type { DownloadExtras, JobInput } from "@vault/types";

const SearchResultCard = ({ result }: { result: SearchResult }) => {
  const { openFormatModal } = useModalActions();
  const probeMutation = useProbeFormatsMutation();
  const queueMutation = useQueueDownload();
  const settings = useSettingsStore(selectSettings);

  const handleDownload = () => {
    probeMutation.mutate(result.url, {
      onSuccess: (formats) => {
        const modalData = formatProbeToModalData(formats, result.url);
        openFormatModal(modalData, {
          onConfirm: (options) => {
            const jobInput = {
              url: result.url,
              outputTemplate:
                settings.outputTemplate ||
                (settings.downloadPath
                  ? `${settings.downloadPath}/%(title)s.%(ext)s`
                  : "%(title)s.%(ext)s"),
              formatSelector:
                options.mediaType === "video"
                  ? options.videoFormat?.formatId || "bestvideo+bestaudio/best"
                  : options.audioFormat?.formatId || "bestaudio/best",
              meta: {
                title: result.title,
                channel: result.channel,
                thumbnailUrl: result.thumbnail || undefined,
                mediaType: options.mediaType === "audio" ? "music" : "video"
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

export const QueueView = () => {
  const [activeFilter, setActiveFilter] = useState<QueueFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);

  const { data: activeJobs = [], isLoading } = useActiveJobs();
  const pauseMutation = usePauseDownload();
  const resumeMutation = useResumeDownload();
  const retryMutation = useRetryDownload();
  const cancelMutation = useCancelDownload();

  const { inputValue, results, error, hasMore, currentPage, query } = useSearchState();
  const { clearSearch, setInputValue } = useSearchActions();
  const searchMutation = useSearchYoutubeMutation();
  const { openFormatModal } = useModalActions();
  const probeMutation = useProbeFormatsMutation();
  const queueMutation = useQueueDownload();
  const settings = useSettingsStore(selectSettings);

  // Map Job to QueueItem
  const items: QueueItem[] = useMemo(() => {
    return activeJobs.map((job) => {
      let status: QueueFilter = "queued";
      if (job.status === "active") status = "downloading";
      if (job.status === "failed") status = "error";
      if (job.status === "paused") status = "paused";

      return {
        id: job.id,
        title: job.meta?.title || job.url,
        channel: job.meta?.channel || "Unknown",
        status,
        addedAt: new Date(job.createdAt),
        url: job.url,
        thumbnail: job.meta?.thumbnailUrl,
        type: job.meta?.mediaType ?? "video",
        format: job.formatSelector || "best",
        errorMessage: job.error
      };
    });
  }, [activeJobs]);

  const filteredItems = items.filter((item) => {
    if (activeFilter === "all") return true;
    return item.status === activeFilter;
  });

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selected) => selected !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => setSelectedIds(filteredItems.map((item) => item.id));
  const handleSelectNone = () => setSelectedIds([]);

  const handleBulkAction = useCallback(
    (action: "pause" | "resume" | "retry" | "cancel") => {
      const jobs = selectedIds;
      setSelectedIds([]);
      for (const id of jobs) {
        switch (action) {
          case "pause":
            pauseMutation.mutate(id);
            break;
          case "resume":
            resumeMutation.mutate(id);
            break;
          case "retry":
            retryMutation.mutate(id);
            break;
          case "cancel":
            cancelMutation.mutate(id);
            break;
        }
      }
    },
    [selectedIds, pauseMutation, resumeMutation, retryMutation, cancelMutation]
  );

  const handlePauseAll = useCallback(() => {
    const activeIds = activeJobs.filter((j) => j.status === "active").map((j) => j.id);
    for (const id of activeIds) pauseMutation.mutate(id);
  }, [activeJobs, pauseMutation]);

  const stats: QueueStats = {
    total: items.length,
    downloading: items.filter((i) => i.status === "downloading").length,
    paused: items.filter((i) => i.status === "paused").length,
    queued: items.filter((i) => i.status === "queued").length,
    error: items.filter((i) => i.status === "error").length
  };

  // Search handlers
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
          const modalData = formatProbeToModalData(formats, value);
          openFormatModal(modalData, {
            isLoading: false,
            onConfirm: (options) => {
              const jobInput = {
                url: value,
                outputTemplate:
                  settings.outputTemplate ||
                  (settings.downloadPath
                    ? `${settings.downloadPath}/%(title)s.%(ext)s`
                    : "%(title)s.%(ext)s"),
                formatSelector:
                  options.mediaType === "video"
                    ? options.videoFormat?.formatId || "bestvideo+bestaudio/best"
                    : options.audioFormat?.formatId || "bestaudio/best",
                meta: {
                  title: modalData.title,
                  channel: modalData.channel,
                  thumbnailUrl: modalData.thumbnail,
                  mediaType: options.mediaType === "audio" ? "music" : "video"
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

  const busy = searchMutation.isPending || probeMutation.isPending;
  const isSearching = results.length > 0 || busy || !!error;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Loading queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
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
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
              >
                <Kbd className="bg-transparent">{getModifierKey()}</Kbd>
                <Kbd className="bg-transparent">K</Kbd>
              </button>
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

          {busy && results.length === 0 && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-secondary/50 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Queue (hidden while searching) */}
      {!isSearching && (
        <div className="space-y-2">
          <FilterTabs
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            stats={stats}
            onPauseAll={handlePauseAll}
          />
          <BulkActions
            selectedCount={selectedIds.length}
            onSelectAll={handleSelectAll}
            totalCount={filteredItems.length}
            onSelectNone={handleSelectNone}
            onBulkAction={handleBulkAction}
          />
          <QueueList items={filteredItems} selectedIds={selectedIds} onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
};
