import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Job, YtDlpProgress } from "@vault/types";
import { QueryKeys } from "@/lib/constants/query-keys";
import { formatError } from "@/lib/utils/format-error";
import { toast } from "sonner";

export function useJobEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!globalThis.api) return;

    const unsubscribes: Array<() => void> = [];

    // On progress, store progress separately (only for active jobs)
    const unsubProgress = globalThis.api.onJobProgress((jobId: string, progress: YtDlpProgress) => {
      // Check if job is still active before updating progress
      const activeJobs = queryClient.getQueryData<Job[]>(QueryKeys.jobs.active()) || [];
      const job = activeJobs.find((j) => j.id === jobId);
      if (job && job.status === "active") {
        queryClient.setQueryData(QueryKeys.jobs.progress(jobId), progress);
      }
    });
    unsubscribes.push(unsubProgress);

    // On completion, show toast and invalidate history
    const unsubCompleted = globalThis.api.onJobCompleted((job: Job) => {
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
      toast.success(`Download completed: ${job.meta?.title || job.url}`);
    });
    unsubscribes.push(unsubCompleted);

    // On failure, show toast and invalidate history
    const unsubFailed = globalThis.api.onJobFailed((job: Job, err) => {
      const errorMessage = formatError(err?.message || err);
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
      toast.error(`Download failed: ${job.meta?.title || job.url}`, {
        description: errorMessage
      });
    });
    unsubscribes.push(unsubFailed);

    // On cancellation, invalidate history
    const unsubCancelled = globalThis.api.onJobCancelled((job: Job) => {
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
    });
    unsubscribes.push(unsubCancelled);

    // On pause, remove progress
    const unsubPaused = globalThis.api.onJobPaused((job: Job) => {
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
    });
    unsubscribes.push(unsubPaused);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [queryClient]);
}
