import { create } from "zustand";

export type NavigationView = "queue" | "history" | "settings" | "logs";

interface NavigationState {
  currentView: NavigationView;
}

interface NavigationActions {
  navigate: (view: NavigationView) => void;
}

export type NavigationStore = NavigationState & NavigationActions;

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentView: "queue",
  navigate: (view) => set({ currentView: view })
}));
