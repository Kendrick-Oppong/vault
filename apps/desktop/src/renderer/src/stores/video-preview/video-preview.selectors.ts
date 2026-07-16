import { useShallow } from "zustand/react/shallow";
import type { VideoPreviewStore } from "./video-preview.store";
import { useVideoPreviewStore } from "./video-preview.store";

const selectVideoPreviewState = (state: VideoPreviewStore) => ({
  isOpen: state.isOpen,
  video: state.video,
  isLoading: state.isLoading,
  error: state.error
});

const selectVideoPreviewActions = (state: VideoPreviewStore) => ({
  open: state.open,
  close: state.close,
  setIsLoading: state.setIsLoading,
  setError: state.setError,
  clear: state.clear
});

export const useVideoPreviewState = () => useVideoPreviewStore(useShallow(selectVideoPreviewState));
export const useVideoPreviewActions = () => useVideoPreviewStore(useShallow(selectVideoPreviewActions));

export const selectVideoPreviewIsOpen = (state: VideoPreviewStore) => state.isOpen;
export const selectVideoPreviewVideo = (state: VideoPreviewStore) => state.video;
export const selectVideoPreviewIsLoading = (state: VideoPreviewStore) => state.isLoading;
export const selectVideoPreviewError = (state: VideoPreviewStore) => state.error;
