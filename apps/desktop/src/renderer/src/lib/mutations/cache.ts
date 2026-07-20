import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { cacheApi } from "@/lib/api/cache";
import { formatError } from "@/lib/utils/format-error";

export const useClearFormatCache = () =>
  useMutation({
    mutationFn: (url?: string) => cacheApi.clearFormatCache(url),
    onSuccess: (_, url) => {
      if (url) {
        toast.success("Format cache cleared", {
          description: `Cleared cache for: ${url.slice(0, 50)}...`
        });
      } else {
        toast.success("All format caches cleared");
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to clear cache", {
        description: formatError(error)
      });
    }
  });

export const useClearDownloadArchive = () =>
  useMutation({
    mutationFn: (downloadPath: string) => globalThis.api.clearDownloadArchive(downloadPath),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Download archive reset");
      } else {
        toast.error("Failed to reset download archive", {
          description: result.error
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to reset download archive", {
        description: formatError(error)
      });
    }
  });
