import { useState, useMemo, useCallback } from "react";
import { useHistoryInfinite } from "@/lib/queries/history";
import { useBulkDeleteHistory } from "@/lib/mutations/history";
import { formatBytes, getFileExtension } from "@/lib/utils/platform";
import { useDebounce } from "@/lib/event-listeners/use-debounce";
import type { HistoryItem, HistorySort, SortOrder, HistoryStats } from "../types";

export function useHistoryView() {
  const [sortBy, setSortBy] = useState<HistorySort>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { mutate: bulkDelete } = useBulkDeleteHistory();

  const {
    data: infiniteData,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useHistoryInfinite({
    search: debouncedSearchQuery,
    sortBy,
    sortOrder
  });

  const history = useMemo(() => infiniteData?.pages.flat() ?? [], [infiniteData]);

  const mappedItems: HistoryItem[] = useMemo(() => {
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
      filePath: entry.file_path || undefined,
      status: entry.status,
      format: getFileExtension(entry.file_path || undefined)
    }));
  }, [history]);

  const totalSizeBytes = useMemo(
    () => mappedItems.reduce((acc, item) => acc + item.sizeBytes, 0),
    [mappedItems]
  );

  const totalSize = useMemo(() => formatBytes(totalSizeBytes), [totalSizeBytes]);

  const stats: HistoryStats = useMemo(
    () => ({
      total: history.length,
      totalSize,
      totalSizeBytes
    }),
    [history.length, totalSize, totalSizeBytes]
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedIds(new Set());
  }, []);

  const handleSortChange = useCallback(
    (sort: HistorySort) => {
      setSelectedIds(new Set());
      if (sort === sortBy) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(sort);
        setSortOrder("desc");
      }
    },
    [sortBy]
  );

  const handleSortOrderChange = useCallback(() => {
    setSelectedIds(new Set());
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(mappedItems.map((i) => i.id)));
  }, [mappedItems]);

  const handleSelectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    bulkDelete([...selectedIds], {
      onSuccess: () => setSelectedIds(new Set())
    });
  }, [bulkDelete, selectedIds]);

  return {
    sortBy,
    sortOrder,
    searchQuery,
    handleSearchChange,
    handleSortChange,
    handleSortOrderChange,
    mappedItems,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    stats,
    selectedIds,
    handleSelect,
    handleSelectAll,
    handleSelectNone,
    handleBulkDelete
  };
}
