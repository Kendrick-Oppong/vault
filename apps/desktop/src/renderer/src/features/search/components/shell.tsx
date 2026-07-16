import { useState } from "react";
import { Input } from "@vault/ui/components/input";
import { Button } from "@vault/ui/components/button";
import { Badge } from "@vault/ui/components/badge";
import { Search, Video, Music, Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useSearchState, useSearchActions } from "@/stores/search/search.selectors";
import { useSearchYoutubeMutation } from "@/lib/mutations/search";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { useProbeFormatsMutation } from "@/lib/mutations/downloads";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import { useQueueDownload } from "@/lib/mutations/downloads";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import type { SearchResult } from "@/features/search/types";

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

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
              outputTemplate: settings.downloadPath
                ? `${settings.downloadPath}/%(title)s.%(ext)s`
                : "%(title)s.%(ext)s",
              formatSelector:
                options.mediaType === "video"
                  ? options.videoFormat?.formatId || "bestvideo+bestaudio/best"
                  : options.audioFormat?.formatId || "bestaudio/best",
              meta: {
                title: result.title,
                channel: result.channel,
                thumbnailUrl: result.thumbnail || undefined,
                mediaType: options.mediaType
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
                cookiesFromBrowser: settings.cookiesFromBrowser
              }
            };
            queueMutation.mutate(jobInput);
          }
        });
      },
      onError: () => {
        // Try quick-add with best quality as fallback
        toast.error("Could not fetch format info", {
          description: "Try pasting the URL directly in the input above"
        });
      }
    });
  };

  return (
    <div className="group flex gap-3 p-3 rounded-xl border border-border bg-card hover:bg-card-hover transition-colors">
      {/* Thumbnail */}
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

      {/* Info */}
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

export const SearchView = () => {
  const [inputValue, setInputValue] = useState("");
  const { results, error, hasMore, currentPage } = useSearchState();
  const { clearSearch } = useSearchActions();
  const searchMutation = useSearchYoutubeMutation();

  const handleSearch = () => {
    if (!inputValue.trim()) return;
    searchMutation.mutate({ query: inputValue.trim(), page: 0 });
  };

  const handleLoadMore = () => {
    searchMutation.mutate({ query: inputValue.trim(), page: currentPage + 1 });
  };

  const handleClear = () => {
    setInputValue("");
    clearSearch();
  };

  return (
    <div className="space-y-4 py-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search YouTube videos..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 pr-10 h-10"
            autoFocus
          />
          {inputValue && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={searchMutation.isPending || !inputValue.trim()}
          className="h-10 px-4 gap-2"
        >
          {searchMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
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
                disabled={searchMutation.isPending}
                className="gap-2 text-sm"
              >
                {searchMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !searchMutation.isPending && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Search YouTube</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Type a search query and press Enter
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {searchMutation.isPending && results.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
};
