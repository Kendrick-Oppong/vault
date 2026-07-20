import { useQuery, useMutation } from "@tanstack/react-query";
import { appApi } from "@/lib/api/app";
import { toast } from "sonner";
import { formatError } from "@/lib/utils/format-error";

export const useAppInfo = () =>
  useQuery({
    queryKey: ["app", "info"] as const,
    queryFn: () => appApi.getInfo(),
    staleTime: Infinity // App version doesn't change at runtime
  });

export const useDownloadUpdate = () => {
  return useMutation({
    mutationFn: () => appApi.downloadUpdate(),
    onError: (error: Error) => {
      toast.error("Could not download update", {
        description: formatError(error)
      });
    }
  });
};

export const useInstallUpdate = () => {
  return useMutation({
    mutationFn: () => appApi.installUpdate(),
    onError: (error: Error) => {
      toast.error("Could not install update", {
        description: formatError(error)
      });
    }
  });
};

export const useCheckForUpdates = () => {
  const downloadUpdateMutation = useDownloadUpdate();

  return useMutation({
    mutationFn: () => appApi.checkForUpdates(),
    onSuccess: (result) => {
      if (result.updateAvailable) {
        toast.success("Update available!", {
          description: result.version
            ? `Version ${result.version} is available`
            : "A new version is available",
          action: {
            label: "Download now",
            onClick: () => downloadUpdateMutation.mutate()
          },
          duration: 10000
        });
      } else {
        toast.info("You're up to date", {
          description: "No updates available right now"
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Could not check for updates", {
        description: formatError(error)
      });
    }
  });
};
