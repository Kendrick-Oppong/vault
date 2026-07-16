import type { NavigationStore } from "./navigation.store";
import { useNavigationStore } from "./navigation.store";
import { useShallow } from "zustand/react/shallow";

const selectNavigationState = (state: NavigationStore) => ({
  currentView: state.currentView,
  navigate: state.navigate
});

const selectNavigationActions = (state: NavigationStore) => ({
  navigate: state.navigate
});

export const selectCurrentView = (state: NavigationStore) => state.currentView;
export const selectNavigate = (state: NavigationStore) => state.navigate;

// wrapped hooks for components to use
export const useNavigationState = () => {
  return useNavigationStore(useShallow(selectNavigationState));
};

export const useNavigationActions = () => {
  return useNavigationStore(useShallow(selectNavigationActions));
};
