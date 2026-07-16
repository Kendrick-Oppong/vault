import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants/query-keys";
import { downloadsApi } from "@/lib/api/downloads";
import type { SearchResult } from "@/features/search/types";

export const useYoutubeSearch = (query: string, page: number = 0, enabled: boolean = true) =>
  useQuery<SearchResult[]>({
    queryKey: QueryKeys.search.youtube(query, page),
    queryFn: () => downloadsApi.searchYoutube(query, page),
    enabled: enabled && query.length > 0,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
