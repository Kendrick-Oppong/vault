import { create } from "zustand";
import type { SearchResult } from "@/features/search/types";

export interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

export interface SearchActions {
  setQuery: (query: string) => void;
  setResults: (results: SearchResult[]) => void;
  appendResults: (results: SearchResult[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  setCurrentPage: (page: number) => void;
  clearSearch: () => void;
  reset: () => void;
}

export type SearchStore = SearchState & SearchActions;

const initialState: SearchState = {
  query: "",
  results: [],
  isLoading: false,
  error: null,
  hasMore: false,
  currentPage: 0
};

export const useSearchStore = create<SearchStore>((set) => ({
  ...initialState,

  setQuery: (query: string) => set({ query }),
  setResults: (results: SearchResult[]) => set({ results }),
  appendResults: (results: SearchResult[]) =>
    set((state) => ({ results: [...state.results, ...results] })),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  setHasMore: (hasMore: boolean) => set({ hasMore }),
  setCurrentPage: (page: number) => set({ currentPage: page }),

  clearSearch: () =>
    set({
      query: "",
      results: [],
      error: null,
      hasMore: false,
      currentPage: 0
    }),

  reset: () => set(initialState)
}));
