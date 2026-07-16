import { useShallow } from "zustand/react/shallow";
import type { PlaylistStore } from "./playlist.store";
import { usePlaylistStore } from "./playlist.store";

const selectPlaylistState = (state: PlaylistStore) => ({
  items: state.items,
  selectedItemIds: Array.from(state.selectedItemIds),
  isAllSelected: state.isAllSelected,
  playlistUrl: state.playlistUrl,
  playlistTitle: state.playlistTitle
});

const selectPlaylistActions = (state: PlaylistStore) => ({
  setItems: state.setItems,
  toggleItem: state.toggleItem,
  toggleAllItems: state.toggleAllItems,
  selectItems: state.selectItems,
  deselectItems: state.deselectItems,
  selectAll: state.selectAll,
  deselectAll: state.deselectAll,
  setPlaylistUrl: state.setPlaylistUrl,
  setPlaylistTitle: state.setPlaylistTitle,
  reset: state.reset
});

export const usePlaylistState = () => usePlaylistStore(useShallow(selectPlaylistState));
export const usePlaylistActions = () => usePlaylistStore(useShallow(selectPlaylistActions));

export const selectPlaylistItems = (state: PlaylistStore) => state.items;
export const selectPlaylistSelectedIds = (state: PlaylistStore) => Array.from(state.selectedItemIds);
export const selectPlaylistIsAllSelected = (state: PlaylistStore) => state.isAllSelected;
export const selectPlaylistUrl = (state: PlaylistStore) => state.playlistUrl;
export const selectPlaylistTitle = (state: PlaylistStore) => state.playlistTitle;
