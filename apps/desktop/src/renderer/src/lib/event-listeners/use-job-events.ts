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

    const updateJobStatus = (jobId: string, status: Job["status"]) => {
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
        old.map((j) => (j.id === jobId ? { ...j, status } : j))
      );
    };

    const handleJobQueued = () => {
      // Don't add optimistically - let polling handle it to avoid duplicates
      // The polling will pick up the new job within 2 seconds
    };

    const handleJobStarted = (job: Job) => {
      updateJobStatus(job.id, "active");
    };

    const handleJobProgress = (jobId: string, progress: YtDlpProgress) => {
      const activeJobs = queryClient.getQueryData<Job[]>(QueryKeys.jobs.active()) || [];
      const job = activeJobs.find((j) => j.id === jobId);
      if (job && job.status === "active") {
        queryClient.setQueryData(QueryKeys.jobs.progress(jobId), progress);
      }
    };

    const handleJobCompleted = (job: Job) => {
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.base() });
      toast.success(`Download completed: ${job.meta?.title || job.url}`);
    };

    const handleJobFailed = (job: Job, err: unknown) => {
      const errorMessage = formatError(
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message?: string }).message
          : err
      );
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.base() });
      toast.error(`Download failed: ${job.meta?.title || job.url}`, {
        description: errorMessage
      });
    };

    const handleJobCancelled = (job: Job) => {
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.base() });
    };

    const handleJobPaused = (job: Job) => {
      updateJobStatus(job.id, "paused");
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
    };

    // Subscribe to all job events
    unsubscribes.push(
      globalThis.api.onJobQueued(handleJobQueued),
      globalThis.api.onJobStarted(handleJobStarted),
      globalThis.api.onJobProgress(handleJobProgress),
      globalThis.api.onJobCompleted(handleJobCompleted),
      globalThis.api.onJobFailed(handleJobFailed),
      globalThis.api.onJobCancelled(handleJobCancelled),
      globalThis.api.onJobPaused(handleJobPaused)
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [queryClient]);
}
