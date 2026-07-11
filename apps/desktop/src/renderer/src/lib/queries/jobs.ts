import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants/query-keys";
import type { Job, YtDlpProgress } from "@vault/types";

export const useActiveJobs = () =>
  useQuery<Job[]>({
    queryKey: QueryKeys.jobs.active(),
    // The queryFn is just a dummy because data is populated by useJobEvents listener
    queryFn: () => [],
    initialData: [],
    staleTime: Infinity // Data is managed manually via events
  });

export const useJobProgress = (jobId: string) =>
  useQuery<YtDlpProgress | undefined>({
    queryKey: QueryKeys.jobs.progress(jobId),
    queryFn: () => undefined,
    initialData: undefined,
    staleTime: Infinity
  });
