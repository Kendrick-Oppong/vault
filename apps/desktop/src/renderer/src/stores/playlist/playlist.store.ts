import { create } from "zustand";
import type { PlaylistItem } from "@/features/playlist/types";

export interface PlaylistState {
  items: PlaylistItem[];
  selectedItemIds: Set<string>;
  isAllSelected: boolean;
  playlistUrl: string | null;
  playlistTitle: string;
}

export interface PlaylistActions {
  setItems: (items: PlaylistItem[]) => void;
  toggleItem: (id: string) => void;
  toggleAllItems: () => void;
  selectItems: (ids: string[]) => void;
  deselectItems: (ids: string[]) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setPlaylistUrl: (url: string | null) => void;
  setPlaylistTitle: (title: string) => void;
  reset: () => void;
}

export type PlaylistStore = PlaylistState & PlaylistActions;

const initialState: PlaylistState = {
  items: [],
  selectedItemIds: new Set(),
  isAllSelected: false,
  playlistUrl: null,
  playlistTitle: ""
};

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  ...initialState,

  setItems: (items: PlaylistItem[]) => set({ items, selectedItemIds: new Set(), isAllSelected: false }),

  toggleItem: (id: string) =>
    set((state) => {
      const newSelected = new Set(state.selectedItemIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      const isAllSelected = newSelected.size === state.items.length && state.items.length > 0;
      return { selectedItemIds: newSelected, isAllSelected };
    }),

  toggleAllItems: () => {
    const state = get();
    if (state.isAllSelected) {
      set({ selectedItemIds: new Set(), isAllSelected: false });
    } else {
      const allIds = new Set(state.items.map((item) => item.id));
      set({ selectedItemIds: allIds, isAllSelected: true });
    }
  },

  selectItems: (ids: string[]) =>
    set((state) => {
      const newSelected = new Set(state.selectedItemIds);
      ids.forEach((id) => newSelected.add(id));
      const isAllSelected = newSelected.size === state.items.length && state.items.length > 0;
      return { selectedItemIds: newSelected, isAllSelected };
    }),

  deselectItems: (ids: string[]) =>
    set((state) => {
      const newSelected = new Set(state.selectedItemIds);
      ids.forEach((id) => newSelected.delete(id));
      return { selectedItemIds: newSelected, isAllSelected: false };
    }),

  selectAll: () => {
    const state = get();
    const allIds = new Set(state.items.map((item) => item.id));
    set({ selectedItemIds: allIds, isAllSelected: true });
  },

  deselectAll: () => set({ selectedItemIds: new Set(), isAllSelected: false }),

  setPlaylistUrl: (url: string | null) => set({ playlistUrl: url }),
  setPlaylistTitle: (title: string) => set({ playlistTitle: title }),

  reset: () => set(initialState)
}));
