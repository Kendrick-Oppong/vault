import { Loader2, Search } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { useSearchState, useSearchActions } from "@/stores/search/search.selectors";
import { SearchResultCard } from "./search-result-card";

interface SearchResultsDisplayProps {
  onLoadMore: () => void;
  isPending: boolean;
}

export const SearchResultsDisplay = ({ onLoadMore, isPending }: SearchResultsDisplayProps) => {
  const { results, error, hasMore } = useSearchState();
  const { setInputValue } = useSearchActions();

  const handleClear = () => {
    setInputValue("");
  };

  if (results.length === 0 && !isPending && !error) {
    return null;
  }

  return (
    <div className="space-y-3">
      {isPending && results.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Search className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear search
          </Button>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="space-y-2">
            {results.map((result) => (
              <SearchResultCard key={result.id} result={result} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
