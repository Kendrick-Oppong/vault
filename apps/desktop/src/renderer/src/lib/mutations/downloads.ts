import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { downloadsApi } from "@/lib/api/downloads";
import { QueryKeys } from "@/lib/constants/query-keys";
import { formatError } from "@/lib/utils/format-error";
import type { JobInput, Job } from "@vault/types";

export const useProbeFormatsMutation = () => {
  return useMutation({
    mutationFn: ({ url, playlistLimit }: { url: string; playlistLimit?: number }) =>
      downloadsApi.probeFormats(url, playlistLimit),
    onError: (error: Error) => {
      toast.error("Failed to fetch video information", {
        description: formatError(error)
      });
    }
  });
};

export const useProbePlaylistPageMutation = () => {
  return useMutation({
    mutationFn: ({ url, start, end }: { url: string; start: number; end: number }) =>
      downloadsApi.probePlaylistPage(url, start, end),
    onError: (error: Error) => {
      toast.error("Failed to load more playlist items", {
        description: formatError(error)
      });
    }
  });
};

export const useQueueDownload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JobInput) => downloadsApi.queueDownload(input),
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
      toast.success("Download queued successfully", {
        description: `Job ID: ${jobId.slice(0, 8)}...`
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to queue download", {
        description: formatError(error)
      });
    }
  });
};

export const useCancelDownload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.cancelDownload(jobId),
    onSuccess: (success, jobId) => {
      if (success) {
        queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old) =>
          old ? old.filter((j) => j.id !== jobId) : []
        );
        toast.success("Download cancelled");
      } else {
        toast.error("Failed to cancel download", {
          description: "Job not found or already completed"
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to cancel download", {
        description: formatError(error)
      });
    }
  });
};

export const useSetConcurrency = () => {
  return useMutation({
    mutationFn: (n: number) => downloadsApi.setConcurrency(n),
    onSuccess: (_, n) => {
      toast.success("Concurrency updated", {
        description: `Now running ${n} concurrent download${n !== 1 ? "s" : ""}`
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to update concurrency limit", {
        description: formatError(error)
      });
    }
  });
};

export const usePauseDownload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.pauseDownload(jobId),
    onSuccess: (success, jobId) => {
      if (success) {
        // The job:paused event from the main process will update the cache,
        // but we optimistically update here for snappy UI.
        queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
          old.map((j) => (j.id === jobId ? { ...j, status: "paused" as const } : j))
        );
        queryClient.removeQueries({ queryKey: QueryKeys.jobs.progress(jobId) });
        toast.info("Download paused");
      } else {
        toast.error("Failed to pause download", {
          description: "Job not found or not active"
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to pause download", {
        description: formatError(error)
      });
    }
  });
};

export const useResumeDownload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.resumeDownload(jobId),
    onSuccess: (newJobId, oldJobId) => {
      if (newJobId) {
        // The job:queued event will add the new job and we'll handle the transition
        // Optimistically update the old job status to indicate it's being resumed
        queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
          old.map((j) => (j.id === oldJobId ? { ...j, status: "pending" } : j))
        );
        toast.success("Download resumed");
      } else {
        toast.error("Failed to resume download", {
          description: "No stored input found for this job"
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to resume download", {
        description: formatError(error)
      });
    }
  });
};

export const useRetryDownload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.retryDownload(jobId),
    onSuccess: (newJobId, oldJobId) => {
      if (newJobId) {
        //
        // Optimistically update the old job status to indicate it's being retried
        queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old = []) =>
          old.map((j) => (j.id === oldJobId ? { ...j, status: "pending" } : j))
        );
        toast.success("Retrying download");
      } else {
        toast.error("Failed to retry download", {
          description: "No stored input found for this job"
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to retry download", {
        description: formatError(error)
      });
    }
  });
};

export const useInstallDependencies = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => downloadsApi.dependenciesDownload(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependencies", "check"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to install dependencies", {
        description: formatError(error)
      });
    }
  });
};

export const useOpenFile = () => {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const exists = await downloadsApi.fileExists(filePath);
      if (!exists) {
        throw new Error("File not found at the specified path.");
      }
      const errorStr = await downloadsApi.openFile(filePath);
      if (errorStr) {
        throw new Error(`Failed to open file: ${errorStr}`);
      }
    },
    onError: (error: Error) => {
      toast.error("Could not open file", {
        description: formatError(error)
      });
    }
  });
};

export const useRevealFile = () => {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const exists = await downloadsApi.fileExists(filePath);
      if (exists) {
        await downloadsApi.revealFile(filePath);
      } else {
        // Fallback to opening parent directory
        const parentPath = filePath.split(/[/\\]/).slice(0, -1).join("\\");
        const parentExists = await downloadsApi.fileExists(parentPath);
        if (parentExists) {
          await downloadsApi.openFile(parentPath);
          toast.warning("File not found. Opened parent folder instead.");
        } else {
          throw new Error("File and parent folder not found.");
        }
      }
    },
    onError: (error: Error) => {
      toast.error("Could not open destination", {
        description: formatError(error)
      });
    }
  });
};
