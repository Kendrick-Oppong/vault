import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { QueryKeys } from "@/lib/constants/query-keys";

export const useYoutubeAuth = () =>
  useQuery({
    queryKey: QueryKeys.auth.youtube(),
    queryFn: () => authApi.checkCookies(),
    staleTime: 0
  });
