import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cookiesApi } from "@/lib/api/cookies";
import { QueryKeys } from "@/lib/constants/query-keys";
import { formatError } from "@/lib/utils/format-error";
import { useSettingsActions } from "@/stores/settings/settings.selectors";

export const useSetCookieBrowser = () => {
  const queryClient = useQueryClient();
  const { updateSetting } = useSettingsActions();

  return useMutation({
    mutationFn: (browser: string) => cookiesApi.setBrowser(browser),
    onMutate: async (browser) => {
      // Optimistically update the setting
      updateSetting("cookiesFromBrowser", browser || null);
    },
    onSuccess: (cookieInfo) => {
      // Invalidate and refetch cookie info
      queryClient.setQueryData(
        QueryKeys.cookies.info(cookieInfo.browser || null),
        cookieInfo
      );

      if (cookieInfo.cached) {
        toast.success("Cookies exported successfully!");
      } else if (cookieInfo.effectiveBrowser) {
        toast.error("Failed to export cookies", {
          description: "Make sure your browser is completely closed and try refreshing."
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to set browser", { description: formatError(error) });
    }
  });
};

export const useRefreshCookies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (browserSetting: string | null) => cookiesApi.refresh(browserSetting),
    onSuccess: (cookieInfo) => {
      queryClient.setQueryData(
        QueryKeys.cookies.info(cookieInfo.browser || null),
        cookieInfo
      );

      if (cookieInfo.cached) {
        toast.success("Cookies refreshed successfully!");
      } else if (cookieInfo.effectiveBrowser) {
        toast.error("Failed to refresh cookies", {
          description: "Make sure your browser is completely closed and try again."
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to refresh cookies", { description: formatError(error) });
    }
  });
};

export const useClearCookies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (browserSetting: string | null) => cookiesApi.clear(browserSetting),
    onSuccess: (cookieInfo) => {
      queryClient.setQueryData(
        QueryKeys.cookies.info(cookieInfo.browser || null),
        cookieInfo
      );
      toast.info("Cookies cleared");
    },
    onError: (error: Error) => {
      toast.error("Failed to clear cookies", { description: formatError(error) });
    }
  });
};
