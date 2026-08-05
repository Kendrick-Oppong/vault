import { useState } from "react";
import { ListPlus } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { useSearchState, useSearchActions } from "@/stores/search/search.selectors";
import { useSearchYoutubeMutation } from "@/lib/mutations/search";
import { useProbeFormatsMutation } from "@/lib/mutations/downloads";
import { CommandMenu } from "@/features/ui/components/command-menu";
import { UrlInputHandler } from "./url-input-handler";
import { SearchResultsDisplay } from "./search-results-display";
import { BatchImportModal } from "./batch-import-modal";

export const QueueInput = () => {
  const [commandOpen, setCommandOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

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
      <BatchImportModal open={batchOpen} onOpenChange={setBatchOpen} />

      <div className="flex items-center gap-2">
        {/* Search / URL input */}
        <UrlInputHandler
          inputValue={inputValue}
          setInputValue={setInputValue}
          busy={busy}
          onSearchTrigger={handleSearchTrigger}
          setCommandOpen={setCommandOpen}
        />

        {/* Batch import trigger */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setBatchOpen(true)}
          title="Batch import links"
        >
          <ListPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search results */}
      {isSearching && (
        <SearchResultsDisplay onLoadMore={handleLoadMore} isPending={searchMutation.isPending} />
      )}
    </>
  );
};
