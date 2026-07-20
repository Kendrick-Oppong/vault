import { useState, useMemo } from "react";
import { FilterTabs } from "./filter-tabs";
import { LibraryCard } from "./library-card";
import type { LibraryItem, LibrarySort, SortOrder } from "../types";
import { EmptyState } from "@/features/ui/components/empty-state";
import { Search, Loader2, ChevronDown } from "lucide-react";

import { useHistoryInfinite } from "@/lib/queries/history";
import { formatBytes } from "@/lib/utils/platform";

export const LibraryView = () => {
  const [sortBy, setSortBy] = useState<LibrarySort>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useHistoryInfinite();

  const history = useMemo(() => infiniteData?.pages.flat() || [], [infiniteData]);

  const mappedItems: LibraryItem[] = useMemo(() => {
    return history.map((entry) => ({
      id: entry.job_id,
      title: entry.title || entry.url,
      channel: entry.channel || "Unknown",
      type: (entry.media_type as "video" | "music") || "video",
      quality: entry.quality || "—",
      size: entry.file_size ? formatBytes(entry.file_size) : "—",
      sizeBytes: entry.file_size || 0,
      addedAt: new Date(entry.completed_at || entry.created_at),
      thumbnail: entry.thumbnail_url || undefined,
      url: entry.url,
      filePath: entry.file_path || undefined
    }));
  }, [history]);

  const filteredAndSortedItems = useMemo(() => {
    const filtered = mappedItems.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.channel.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "date":
          comparison = a.addedAt.getTime() - b.addedAt.getTime();
          break;
        case "size":
          comparison = a.sizeBytes - b.sizeBytes;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [mappedItems, searchQuery, sortBy, sortOrder]);

  const handleSortChange = (sort: LibrarySort) => {
    if (sort === sortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(sort);
      setSortOrder("desc");
    }
  };

  const handleSortOrderChange = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Loading library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-2">
        <p className="text-[13px] font-semibold text-muted-foreground whitespace-nowrap">
          {history.length} item{history.length > 1 && "s"}
        </p>
        <div className="flex-1 max-w-1/2">
          <FilterTabs
            sortBy={sortBy}
            sortOrder={sortOrder}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSortChange={handleSortChange}
            onSortOrderChange={handleSortOrderChange}
          />
        </div>
      </div>

      {filteredAndSortedItems.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description="Try adjusting your search or filters"
        />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {filteredAndSortedItems.map((item) => (
              <LibraryCard key={item.id} item={item} />
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-foreground/10 hover:bg-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More
                    <ChevronDown className="size-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
