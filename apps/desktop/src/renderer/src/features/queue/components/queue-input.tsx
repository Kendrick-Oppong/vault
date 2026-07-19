import { useState } from "react";
import { useSearchState, useSearchActions } from "@/stores/search/search.selectors";
import { useSearchYoutubeMutation } from "@/lib/mutations/search";
import { useProbeFormatsMutation } from "@/lib/mutations/downloads";
import { CommandMenu } from "@/features/ui/components/command-menu";
import { UrlInputHandler } from "./url-input-handler";
import { SearchResultsDisplay } from "./search-results-display";

export const QueueInput = () => {
  const [commandOpen, setCommandOpen] = useState(false);

  const { inputValue, results, error, currentPage, query } = useSearchState();
  const { setInputValue, clearSearch } = useSearchActions();
  const searchMutation = useSearchYoutubeMutation();
  const probeMutation = useProbeFormatsMutation();

  const busy = searchMutation.isPending || probeMutation.isPending;
  const isSearching = results.length > 0 || busy || !!error;

  const handleSearchTrigger = (searchQuery: string) => {
    clearSearch();
    searchMutation.mutate({ query: searchQuery, page: 0 });
  };

  const handleLoadMore = () => {
    if (!query) return;
    searchMutation.mutate({ query, page: currentPage + 1 });
  };

  return (
    <>
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Search / URL input */}
      <UrlInputHandler
        inputValue={inputValue}
        setInputValue={setInputValue}
        busy={busy}
        onSearchTrigger={handleSearchTrigger}
        setCommandOpen={setCommandOpen}
      />

      {/* Search results */}
      {isSearching && (
        <SearchResultsDisplay onLoadMore={handleLoadMore} isPending={searchMutation.isPending} />
      )}
    </>
  );
};
