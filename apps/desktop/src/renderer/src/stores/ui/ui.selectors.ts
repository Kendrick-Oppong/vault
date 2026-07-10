import type { UIStore } from "./ui.store";
import { useUIStore } from "./ui.store";
import { useShallow } from "zustand/react/shallow";

const selectUIState = (state: UIStore) => ({
  theme: state.theme,
  setTheme: state.setTheme
});

export const selectTheme = (state: UIStore) => state.theme;
export const selectIsDark = (state: UIStore) => state.theme === "dark";
export const selectIsLight = (state: UIStore) => state.theme === "light";

// wrapped hooks for components to use
export const useUIState = () => {
  return useUIStore(useShallow(selectUIState));
};
