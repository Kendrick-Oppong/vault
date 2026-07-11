import { useState, useMemo } from "react";
import { FilterTabs } from "./filter-tabs";
import { BulkActions } from "./bulk-actions";
import { QueueList } from "./queue-list";
import type { QueueFilter, QueueItem, QueueStats } from "../types";
import { useActiveJobs } from "@/lib/queries/jobs";
import { Loader2 } from "lucide-react";

export const QueueView = () => {
  const [activeFilter, setActiveFilter] = useState<QueueFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: activeJobs = [], isLoading } = useActiveJobs();

  // Map Job to QueueItem
  const items: QueueItem[] = useMemo(() => {
    return activeJobs.map((job) => {
      // Map JobStatus to QueueFilter status
      let status: QueueFilter = "queued";
      if (job.status === "active") status = "downloading";
      if (job.status === "failed") status = "error";
      // We don't have paused jobs yet in the backend, but we map it here if it's added
      if (job.status === ("paused" as unknown)) status = "paused";

      return {
        id: job.id,
        title: job.meta?.title || job.url,
        channel: job.meta?.channel || "Unknown",
        status,
        addedAt: new Date(job.createdAt),
        url: job.url,
        thumbnail: job.meta?.thumbnailUrl,
        type: "video", // Defaulting to video
        format: job.formatSelector || "best"
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

  const handleSelectAll = () => {
    setSelectedIds(filteredItems.map((item) => item.id));
  };

  const handleSelectNone = () => {
    setSelectedIds([]);
  };

  const handleBulkAction = (action: "pause" | "resume" | "retry" | "cancel") => {
    console.log(`Bulk ${action} on:`, selectedIds);
    // Implement actual bulk action logic here
    setSelectedIds([]);
  };

  const handlePauseAll = () => {
    console.log("Pause all");
    // Implement pause all logic
  };

  // Update stats based on actual items
  const stats: QueueStats = {
    total: items.length,
    downloading: items.filter((i) => i.status === "downloading").length,
    paused: items.filter((i) => i.status === "paused").length,
    queued: items.filter((i) => i.status === "queued").length,
    error: items.filter((i) => i.status === "error").length
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Loading queue...</p>
      </div>
    );
  }

  return (
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
  );
};
