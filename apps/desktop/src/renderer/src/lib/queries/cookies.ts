import { useQuery } from "@tanstack/react-query";
import { cookiesApi } from "@/lib/api/cookies";
import { QueryKeys } from "@/lib/constants/query-keys";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";

export const useCookieInfo = () => {
  const settings = useSettingsStore(selectSettings);
  return useQuery({
    queryKey: QueryKeys.cookies.info(settings.cookiesFromBrowser),
    queryFn: () => cookiesApi.getInfo(settings.cookiesFromBrowser),
    staleTime: 30000 // Cookie info can be cached for 30 seconds
  });
};
