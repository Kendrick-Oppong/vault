import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Job, YtDlpProgress } from "@vault/types";
import { QueryKeys } from "@/lib/constants/query-keys";
import { formatError } from "@/lib/utils/format-error";

export function useJobEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!globalThis.api) return;

    const unsubscribes: Array<() => void> = [];

    // When a job is queued, add it to active jobs cache
    const unsubQueued = globalThis.api.onJobQueued((job: Job) => {
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) => {
        // Avoid duplicates
        if (old.some((j) => j.id === job.id)) return old;
        return [...old, job];
      });
    });
    unsubscribes.push(unsubQueued);

    // On start, update status in active cache
    const unsubStarted = globalThis.api.onJobStarted((job: Job) => {
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
        old.map((j) => (j.id === job.id ? job : j))
      );
    });
    unsubscribes.push(unsubStarted);

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

    // On completion, remove from active and invalidate history
    const unsubCompleted = globalThis.api.onJobCompleted((job: Job) => {
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
        old.filter((j) => j.id !== job.id)
      );
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
    });
    unsubscribes.push(unsubCompleted);

    // On failure, update status to failed instead of removing
    const unsubFailed = globalThis.api.onJobFailed((job: Job, err) => {
      const errorMessage = formatError(err?.message || err);
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
        old.map((j) => (j.id === job.id ? { ...job, status: "failed", error: errorMessage } : j))
      );
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
    });
    unsubscribes.push(unsubFailed);

    // On cancellation, same as completion
    const unsubCancelled = globalThis.api.onJobCancelled((job: Job) => {
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
        old.filter((j) => j.id !== job.id)
      );
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
    });
    unsubscribes.push(unsubCancelled);

    // On pause, update status in active cache (job stays visible in queue)
    const unsubPaused = globalThis.api.onJobPaused((job: Job) => {
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
        old.map((j) => (j.id === job.id ? { ...job, status: "paused" as const } : j))
      );
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
    });
    unsubscribes.push(unsubPaused);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [queryClient]);
}
