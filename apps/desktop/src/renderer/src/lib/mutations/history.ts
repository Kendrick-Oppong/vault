import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { historyApi } from "@/lib/api/history";
import { QueryKeys } from "@/lib/constants/query-keys";
import { formatError } from "@/lib/utils/format-error";

export const useDeleteHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => historyApi.delete(jobId),
    onSuccess: (_) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() });
      toast.success("Removed from library");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove from library", {
        description: formatError(error)
      });
    }
  });
};
