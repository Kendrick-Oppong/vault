import { FilterTabs } from "./filter-tabs";
import { HistoryCard } from "./history-card";
import { BulkActions } from "./bulk-actions";
import { EmptyState } from "@/features/ui/components/empty-state";
import { Search, Loader2, ChevronDown, History } from "lucide-react";
import { useHistoryView } from "../hooks/use-history-view";
import { SkeletonLoader } from "@renderer/features/ui/components/skeleton-loader";

export const HistoryView = () => {
  const history = useHistoryView();

  if (history.isLoading) {
    return <SkeletonLoader type="history" />;
  }

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between py-2">
        <p className="text-[13px] font-semibold text-muted-foreground whitespace-nowrap">
          {history.stats.total} items
        </p>
        <div className="flex-1 max-w-1/2">
          <FilterTabs
            sortBy={history.sortBy}
            sortOrder={history.sortOrder}
            searchQuery={history.searchQuery}
            onSearchChange={history.handleSearchChange}
            onSortChange={history.handleSortChange}
            onSortOrderChange={history.handleSortOrderChange}
          />
        </div>
      </div>

      {history.mappedItems.length === 0 ? (
        <EmptyState
          icon={history.searchQuery ? Search : History}
          title={history.searchQuery ? "No results found" : "No history yet"}
          description={
            history.searchQuery
              ? "Try adjusting your search or filters"
              : "Downloads you complete will appear here"
          }
        />
      ) : (
        <>
          <BulkActions
            selectedCount={history.selectedIds.size}
            totalCount={history.mappedItems.length}
            onSelectAll={history.handleSelectAll}
            onSelectNone={history.handleSelectNone}
            onBulkDelete={history.handleBulkDelete}
          />

          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {history.mappedItems.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                isSelected={history.selectedIds.has(item.id)}
                onSelect={history.handleSelect}
              />
            ))}
          </div>

          {history.hasNextPage && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => history.fetchNextPage()}
                disabled={history.isFetchingNextPage}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-foreground/10 hover:bg-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {history.isFetchingNextPage ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More
                    <ChevronDown className="size-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Subtle overlay when searching or sorting */}
      {history.isFetching && !history.isFetchingNextPage && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg transition-opacity pointer-events-none">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
