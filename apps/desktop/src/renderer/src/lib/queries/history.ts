import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { historyApi } from "@/lib/api/history";
import { QueryKeys } from "@/lib/constants/query-keys";
import { usePlaylistFetchLimit } from "@/stores/settings/settings.selectors";

export const useHistory = (limit?: number, offset?: number) =>
  useQuery({
    queryKey: QueryKeys.history.all(limit, offset),
    queryFn: () => historyApi.list(limit, offset)
  });

export const useHistoryInfinite = () => {
  const playlistFetchLimit = usePlaylistFetchLimit();

  return useInfiniteQuery({
    queryKey: QueryKeys.history.infinite(playlistFetchLimit),
    queryFn: ({ pageParam = 0 }) => historyApi.list(playlistFetchLimit, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // If limit is 0 (no limit), stop after first page to prevent infinite loading
      if (playlistFetchLimit === 0) return undefined;
      if (lastPage.length < playlistFetchLimit) return undefined;
      return lastPageParam + playlistFetchLimit;
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
};
