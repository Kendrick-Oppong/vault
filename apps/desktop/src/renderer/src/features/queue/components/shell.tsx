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
  useCancelDownload
} from "@/lib/mutations/downloads";
import { Loader2 } from "lucide-react";

export const QueueView = () => {
  const [activeFilter, setActiveFilter] = useState<QueueFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: activeJobs = [], isLoading } = useActiveJobs();
  const pauseMutation = usePauseDownload();
  const resumeMutation = useResumeDownload();
  const retryMutation = useRetryDownload();
  const cancelMutation = useCancelDownload();

  // Map Job to QueueItem
  const items: QueueItem[] = useMemo(() => {
    return activeJobs.map((job) => {
      // Map JobStatus to QueueFilter status
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

  const handleSelectAll = () => {
    setSelectedIds(filteredItems.map((item) => item.id));
  };

  const handleSelectNone = () => {
    setSelectedIds([]);
  };

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
    // Pause all currently downloading (active) jobs
    const activeIds = activeJobs.filter((j) => j.status === "active").map((j) => j.id);
    for (const id of activeIds) {
      pauseMutation.mutate(id);
    }
  }, [activeJobs, pauseMutation]);

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
