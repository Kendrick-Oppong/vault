import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants/query-keys";
import { downloadsApi } from "@/lib/api/downloads";
import type { Job, YtDlpProgress } from "@vault/types";

export const useActiveJobs = () =>
  useQuery<Job[]>({
    queryKey: QueryKeys.jobs.active(),
    queryFn: () => downloadsApi.getJobs(),
    refetchInterval: 2000 // Poll every 2 seconds for updates
  });

export const useJobProgress = (jobId: string) =>
  useQuery<YtDlpProgress | undefined>({
    queryKey: QueryKeys.jobs.progress(jobId),
    queryFn: () => undefined,
    initialData: undefined,
    staleTime: Infinity
  });
