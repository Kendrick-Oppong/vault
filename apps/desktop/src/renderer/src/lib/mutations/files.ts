import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { filesApi } from "@/lib/api/files";
import { formatError } from "@/lib/utils/format-error";

export const useOpenFolderDialog = () => {
  return useMutation({
    mutationFn: () => filesApi.openFolderDialog(),
    onError: (error: Error) => {
      toast.error("Could not open folder picker", {
        description: formatError(error)
      });
    }
  });
};
