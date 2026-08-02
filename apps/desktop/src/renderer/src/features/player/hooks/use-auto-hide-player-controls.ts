import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/stores/player/player.store";

const AUTO_HIDE_DELAY_MS = 3000;

export function useAutoHidePlayerControls() {
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const resetHideTimer = useCallback(() => {
    clearHideTimer();

    const { isPlaying, isExpanded } = usePlayerStore.getState();

    // Always reveal controls when the user/player state changes.
    setShowControls(true);

    // Only auto-hide when actively playing in expanded mode.
    if (!isPlaying || !isExpanded) {
      return;
    }

    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, AUTO_HIDE_DELAY_MS);
  }, [clearHideTimer]);

  useEffect(() => {
    // If the player is already playing/expanded when this mounts,
    // schedule the first auto-hide.
    const initialState = usePlayerStore.getState();

    if (initialState.isPlaying && initialState.isExpanded) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, AUTO_HIDE_DELAY_MS);
    }

    // Subscribe to player-store changes.
    // State updates happen inside this subscription callback,
    // not synchronously inside the effect body.
    let previous = initialState;

    const unsubscribe = usePlayerStore.subscribe((state) => {
      const relevantChanged =
        state.isPlaying !== previous.isPlaying || state.isExpanded !== previous.isExpanded;

      previous = state;

      if (relevantChanged) {
        resetHideTimer();
      }
    });

    return () => {
      unsubscribe();
      clearHideTimer();
    };
  }, [resetHideTimer, clearHideTimer]);

  const notifyPointerActivity = useCallback(() => {
    if (usePlayerStore.getState().isExpanded) {
      resetHideTimer();
    }
  }, [resetHideTimer]);

  return {
    showControls,
    notifyPointerActivity
  };
}
