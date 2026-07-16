import { create } from "zustand";
import type { VideoPreviewData } from "@/features/video-preview/types";

export interface VideoPreviewState {
  isOpen: boolean;
  video: VideoPreviewData | null;
  isLoading: boolean;
  error: string | null;
}

export interface VideoPreviewActions {
  open: (video: VideoPreviewData) => void;
  close: () => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export type VideoPreviewStore = VideoPreviewState & VideoPreviewActions;

const initialState: VideoPreviewState = {
  isOpen: false,
  video: null,
  isLoading: false,
  error: null
};

export const useVideoPreviewStore = create<VideoPreviewStore>((set) => ({
  ...initialState,

  open: (video: VideoPreviewData) => set({ isOpen: true, video, error: null }),
  close: () => set({ isOpen: false }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clear: () => set(initialState)
}));
