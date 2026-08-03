import { useState, useMemo, useCallback } from "react";
import { FilterTabs } from "./filter-tabs";
import { BulkActions } from "./bulk-actions";
import { QueueList } from "./queue-list";
import { QueueInput } from "./queue-input";
import type { QueueFilter, QueueItem, QueueStats } from "../types";
import { useActiveJobs } from "@/lib/queries/jobs";
import {
  usePauseDownload,
  useResumeDownload,
  useRetryDownload,
  useCancelDownload
} from "@/lib/mutations/downloads";
import { SkeletonLoader } from "@/features/ui/components/skeleton-loader";

// Trimmed downloads can't be resumed, so pausing them is pointless (it would
// just restart on resume). We skip them in pause-all / bulk-pause.
const isTrimmedJob = (job: { extra?: { trimRange?: { start?: string; end?: string } } }) =>
  Boolean(job.extra?.trimRange?.start || job.extra?.trimRange?.end);

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
      let status: QueueFilter = "queued";
      if (job.status === "active") status = "downloading";
      if (job.status === "failed") status = "error";
      if (job.status === "paused") status = "paused";
      if (job.status === "completed") status = "completed";

      return {
        id: job.id,
        title: job.meta?.title || job.url,
        channel: job.meta?.channel || "Unknown",
        status,
        addedAt: new Date(job.createdAt),
        url: job.url,
        thumbnail: job.meta?.thumbnailUrl,
        type: job.meta?.mediaType ?? "video",
        format: job.meta?.quality || "Best",
        rawProgress: job.progress,
        filePath: job.meta?.expectedPath,
        errorMessage: job.error,
        duration: job.meta?.duration,
        // Surface the trim section (if any) so the queue card can show the ✂️ chip.
        trimRange: job.extra?.trimRange
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
      // Resolve selected ids to their queue items so we can skip trimmed jobs
      // for pause/resume (they can't resume).
      const selectedItems = items.filter((i) => jobs.includes(i.id));
      for (const item of selectedItems) {
        const trimmed = Boolean(item.trimRange?.start || item.trimRange?.end);
        switch (action) {
          case "pause":
            if (!trimmed) pauseMutation.mutate(item.id);
            break;
          case "resume":
            if (!trimmed) resumeMutation.mutate(item.id);
            break;
          case "retry":
            retryMutation.mutate(item.id);
            break;
          case "cancel":
            cancelMutation.mutate(item.id);
            break;
        }
      }
    },
    [selectedIds, items, pauseMutation, resumeMutation, retryMutation, cancelMutation]
  );

  const handlePauseAll = useCallback(() => {
    const activeIds = activeJobs
      .filter((j) => j.status === "active" && !isTrimmedJob(j))
      .map((j) => j.id);
    for (const id of activeIds) pauseMutation.mutate(id);
  }, [activeJobs, pauseMutation]);

  const stats: QueueStats = {
    total: items.length,
    downloading: items.filter((i) => i.status === "downloading").length,
    paused: items.filter((i) => i.status === "paused").length,
    queued: items.filter((i) => i.status === "queued").length,
    completed: items.filter((i) => i.status === "completed").length,
    error: items.filter((i) => i.status === "error").length
  };

  if (isLoading) {
    return <SkeletonLoader type="queue" />;
  }

  return (
    <div className="space-y-4 py-4">
      <QueueInput />

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
    </div>
  );
};
