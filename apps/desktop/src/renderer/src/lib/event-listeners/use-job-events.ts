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

    const upsertJob = (job: Job) => {
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) => {
        const existing = old.some((j) => j.id === job.id);
        return existing ? old.map((j) => (j.id === job.id ? job : j)) : [job, ...old];
      });
    };

    const handleJobQueued = (job: Job) => {
      upsertJob(job);
    };

    const handleJobStarted = (job: Job) => {
      upsertJob({ ...job, status: "active" });
    };

    const handleJobProgress = (jobId: string, progress: YtDlpProgress) => {
      queryClient.setQueryData(QueryKeys.jobs.progress(jobId), progress);
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
        old.map((job) => (job.id === jobId ? { ...job, status: "active", progress } : job))
      );
    };

    const handleJobCompleted = (job: Job) => {
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      upsertJob({ ...job, status: "completed" });
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
