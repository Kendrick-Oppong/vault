import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/lib/api/auth";
import { QueryKeys } from "@/lib/constants/query-keys";
import { formatError } from "@/lib/utils/format-error";
import { useSettingsActions } from "@/stores/settings/settings.selectors";

export const useYoutubeLogin = () => {
  const queryClient = useQueryClient();
  const { updateSetting } = useSettingsActions();

  return useMutation({
    mutationFn: () => authApi.login(),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: QueryKeys.auth.youtube() });
        updateSetting("importCookies", "File");
        if (result.filePath) updateSetting("cookiesFilePath", result.filePath);
        toast.success("Signed in to YouTube", {
          description: "Cookies saved. Downloads will use your YouTube session."
        });
      } else {
        toast.error("Sign-in failed", { description: result.error || "Unknown error" });
      }
    },
    onError: (error: Error) => {
      toast.error("Sign-in failed", { description: formatError(error) });
    }
  });
};

export const useYoutubeLogout = () => {
  const queryClient = useQueryClient();
  const { updateSetting } = useSettingsActions();

  return useMutation({
    mutationFn: () => authApi.clearCookies(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.auth.youtube() });
      updateSetting("importCookies", "None");
      updateSetting("cookiesFilePath", "");
      toast.info("Signed out of YouTube");
    },
    onError: (error: Error) => {
      toast.error("Sign-out failed", { description: formatError(error) });
    }
  });
};
