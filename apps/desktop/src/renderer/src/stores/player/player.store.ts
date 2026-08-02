import { create } from "zustand";
import type { HistoryItem } from "@/features/history/types";

export interface PlayerState {
  currentMedia: HistoryItem | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isPiP: boolean;
  isExpanded: boolean; // Full theater mode vs floating
}

export interface PlayerActions {
  playMedia: (item: HistoryItem) => void;
  closeMedia: () => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setIsPiP: (isPiP: boolean) => void;
  toggleExpanded: () => void;
}

export type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set) => ({
  currentMedia: null,
  isPlaying: false,
  volume: 1, // 0 to 1
  isMuted: false,
  isPiP: false,
  isExpanded: false,

  playMedia: (item) => set({ currentMedia: item, isPlaying: true, isExpanded: false }),
  closeMedia: () => set({ currentMedia: null, isPlaying: false, isPiP: false }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setIsPiP: (isPiP) => set({ isPiP }),
  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded }))
}));
