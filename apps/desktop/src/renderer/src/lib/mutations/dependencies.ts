import { useMutation } from "@tanstack/react-query";
import { dependenciesApi } from "@/lib/api/dependencies";
import { toast } from "sonner";
import { formatError } from "@/lib/utils/format-error";

export const useUpdateBinaries = () => {
  return useMutation({
    mutationFn: (binary: "ytdlp" | "ffmpeg" | "all") => dependenciesApi.update(binary),
    onSuccess: () => {
      toast.success("Binaries updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update binaries", {
        description: formatError(error)
      });
    }
  });
};
