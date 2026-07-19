import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { historyApi } from "@/lib/api/history";
import { QueryKeys } from "@/lib/constants/query-keys";
import { formatError } from "@/lib/utils/format-error";

export const useDeleteHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => historyApi.delete(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.base() });
      toast.success("Removed from history");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove from history", {
        description: formatError(error)
      });
    }
  });
};

export const useBulkDeleteHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobIds: string[]) => historyApi.bulkDelete(jobIds),
    onSuccess: (_data, jobIds) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.base() });
      toast.success(`Removed ${jobIds.length} items from history`);
    },
    onError: (error: Error) => {
      toast.error("Failed to remove items from history", {
        description: formatError(error)
      });
    }
  });
};
