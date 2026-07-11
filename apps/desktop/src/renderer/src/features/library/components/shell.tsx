import { useState, useMemo } from "react";
import { FilterTabs } from "./filter-tabs";
import { LibraryCard } from "./library-card";
import type { LibraryItem, LibrarySort, SortOrder, LibraryStats } from "../types";
import { EmptyState } from "@/features/ui/components/empty-state";
import { Search, Loader2 } from "lucide-react";

import { useHistory } from "@/lib/queries/history";
import { formatBytes } from "@/lib/utils/platform";

export const LibraryView = () => {
  const [sortBy, setSortBy] = useState<LibrarySort>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: history = [], isLoading } = useHistory();

  const mappedItems: LibraryItem[] = useMemo(() => {
    return history.map((entry) => ({
      id: entry.job_id,
      title: entry.title || entry.url,
      channel: entry.channel || "Unknown",
      type: "video", // Assuming everything is video for now, unless we can infer from path
      quality: "1080p", // Mock quality
      size: "Unknown", // We'd need to stat the file to get size
      sizeBytes: 0,
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

  // Calculate stats
  const totalSizeBytes = mappedItems.reduce((acc, item) => acc + item.sizeBytes, 0);
  const totalSize = formatBytes(totalSizeBytes);
  const stats: LibraryStats = {
    total: mappedItems.length,
    totalSize,
    totalSizeBytes
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
          {stats.total} items · {stats.totalSize}
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {filteredAndSortedItems.map((item) => (
            <LibraryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
