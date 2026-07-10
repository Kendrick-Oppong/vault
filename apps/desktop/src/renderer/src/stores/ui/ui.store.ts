import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";

interface UIState {
  theme: Theme;
}

interface UIActions {
  setTheme: (theme: Theme) => void;
  initializeTheme: () => void;
}

export type UIStore = UIState & UIActions;

const applyTheme = (theme: Theme) => {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");

  if (theme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
};

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: "dark",

      setTheme: (theme: Theme) => {
        set({ theme });
        applyTheme(theme);
      },

      initializeTheme: () => {
        const currentTheme = get().theme;
        applyTheme(currentTheme);
      }
    }),
    {
      name: "vault-ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme })
    }
  )
);
