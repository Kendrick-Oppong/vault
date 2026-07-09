import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { archiveApi } from "@/lib/api/archive";
import { formatError } from "@/lib/utils/format-error";

export const useSyncChannel = () =>
  useMutation({
    mutationFn: ({
      channelUrl,
      destinationFolder
    }: {
      channelUrl: string;
      destinationFolder: string;
    }) => archiveApi.syncChannel(channelUrl, destinationFolder),
    onSuccess: (result) => {
      toast.success("Channel sync complete", {
        description: `Queued: ${result.queued}, Skipped: ${result.skipped}`
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to sync channel", {
        description: formatError(error)
      });
    }
  });
