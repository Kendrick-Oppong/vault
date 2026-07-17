import { useShallow } from "zustand/react/shallow";
import type { SearchStore } from "./search.store";
import { useSearchStore } from "./search.store";

const selectSearchState = (state: SearchStore) => ({
  query: state.query,
  inputValue: state.inputValue,
  results: state.results,
  isLoading: state.isLoading,
  error: state.error,
  hasMore: state.hasMore,
  currentPage: state.currentPage
});

const selectSearchActions = (state: SearchStore) => ({
  setQuery: state.setQuery,
  setInputValue: state.setInputValue,
  setResults: state.setResults,
  appendResults: state.appendResults,
  setIsLoading: state.setIsLoading,
  setError: state.setError,
  setHasMore: state.setHasMore,
  setCurrentPage: state.setCurrentPage,
  clearSearch: state.clearSearch,
  reset: state.reset
});

export const useSearchState = () => useSearchStore(useShallow(selectSearchState));
export const useSearchActions = () => useSearchStore(useShallow(selectSearchActions));

export const selectSearchQuery = (state: SearchStore) => state.query;
export const selectSearchInputValue = (state: SearchStore) => state.inputValue;
export const selectSearchResults = (state: SearchStore) => state.results;
export const selectSearchIsLoading = (state: SearchStore) => state.isLoading;
export const selectSearchError = (state: SearchStore) => state.error;
export const selectSearchHasMore = (state: SearchStore) => state.hasMore;
export const selectSearchCurrentPage = (state: SearchStore) => state.currentPage;
