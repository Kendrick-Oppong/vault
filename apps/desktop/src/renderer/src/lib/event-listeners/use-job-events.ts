import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
      toast.info("Download started", {
        description: job.meta?.title || job.url.slice(0, 50)
      });
    });
    unsubscribes.push(unsubStarted);

    // On progress, store progress separately
    const unsubProgress = globalThis.api.onJobProgress((jobId: string, progress: YtDlpProgress) => {
      queryClient.setQueryData(QueryKeys.jobs.progress(jobId), progress);
    });
    unsubscribes.push(unsubProgress);

    // On completion, remove from active and invalidate history
    const unsubCompleted = globalThis.api.onJobCompleted((job: Job) => {
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
        old.filter((j) => j.id !== job.id)
      );
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
      toast.success("Download completed", {
        description: job.meta?.title || "Download finished successfully"
      });
    });
    unsubscribes.push(unsubCompleted);

    // On failure, same as completion
    const unsubFailed = globalThis.api.onJobFailed((job: Job, err) => {
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
        old.filter((j) => j.id !== job.id)
      );
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
      toast.error("Download failed", {
        description: formatError(err.message || err)
      });
    });
    unsubscribes.push(unsubFailed);

    // On cancellation, same as completion
    const unsubCancelled = globalThis.api.onJobCancelled((job: Job) => {
      queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
        old.filter((j) => j.id !== job.id)
      );
      queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(job.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
      toast.info("Download cancelled", {
        description: job.meta?.title || "Download was cancelled"
      });
    });
    unsubscribes.push(unsubCancelled);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [queryClient]);
}
