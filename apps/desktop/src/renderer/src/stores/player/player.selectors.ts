import { useShallow } from "zustand/react/shallow";
import { usePlayerStore } from "./player.store";

export type PlayerStore = ReturnType<typeof usePlayerStore.getState>;

const selectPlayerState = (state: PlayerStore) => ({
  currentMedia: state.currentMedia,
  isPlaying: state.isPlaying,
  volume: state.volume,
  isMuted: state.isMuted,
  isPiP: state.isPiP,
  isExpanded: state.isExpanded
});

const selectPlayerActions = (state: PlayerStore) => ({
  playMedia: state.playMedia,
  closeMedia: state.closeMedia,
  setIsPlaying: state.setIsPlaying,
  setVolume: state.setVolume,
  toggleMute: state.toggleMute,
  setIsPiP: state.setIsPiP,
  toggleExpanded: state.toggleExpanded
});

export const selectCurrentMedia = (state: PlayerStore) => state.currentMedia;
export const selectIsPlaying = (state: PlayerStore) => state.isPlaying;
export const selectVolume = (state: PlayerStore) => state.volume;
export const selectIsMuted = (state: PlayerStore) => state.isMuted;
export const selectIsPiP = (state: PlayerStore) => state.isPiP;
export const selectIsExpanded = (state: PlayerStore) => state.isExpanded;

export const usePlayerState = () => {
  return usePlayerStore(useShallow(selectPlayerState));
};

export const usePlayerActions = () => {
  return usePlayerStore(useShallow(selectPlayerActions));
};
