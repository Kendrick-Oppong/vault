import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { downloadsApi } from "@/lib/api/downloads";
import { formatError } from "@/lib/utils/format-error";
import { useSearchActions } from "@/stores/search/search.selectors";
import type { SearchResult } from "@/features/search/types";

export const useSearchYoutubeMutation = () => {
  const { setQuery, setResults, setHasMore, setCurrentPage, setError } = useSearchActions();

  return useMutation({
    mutationFn: ({ query, page }: { query: string; page?: number }) =>
      downloadsApi.searchYoutube(query, page) as Promise<SearchResult[]>,
    onSuccess: (results, { query, page }) => {
      setQuery(query);
      if (page === undefined || page === 0) {
        setResults(results);
      } else {
        // Pagination: append to existing results
      }
      setHasMore(results.length >= 20);
      setCurrentPage(page || 0);
      setError(null);
    },
    onError: (error: Error, { query }) => {
      setQuery(query);
      const errorMsg = formatError(error);
      setError(errorMsg);
      toast.error("Search failed", { description: errorMsg });
    }
  });
};
