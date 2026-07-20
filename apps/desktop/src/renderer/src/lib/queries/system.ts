import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants/query-keys";
import { downloadsApi } from "@/lib/api/downloads";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";

export const useDiskSpace = () => {
  const settings = useSettingsStore(selectSettings);
  const downloadPath = settings.downloadPath;

  return useQuery<{ available: number; total: number }>({
    queryKey: QueryKeys.system.diskSpace(),
    queryFn: () => downloadsApi.checkDiskSpace(downloadPath || ""),
    // Poll every 30 seconds; only run when we have a path
    refetchInterval: 30_000,
    enabled: !!downloadPath,
    // Don't throw — UI just silently hides the banner if unavailable
    retry: 1
  });
};
