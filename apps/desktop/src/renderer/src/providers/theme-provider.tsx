import { useEffect } from "react";
import { useUIStore } from "@/stores/ui/ui.store";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Initialize theme from localStorage on mount
    const initializeTheme = useUIStore.getState().initializeTheme;
    initializeTheme();

    // Listen for system theme changes if theme is set to "system"
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      const theme = useUIStore.getState().theme;
      if (theme === "system") {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(mediaQuery.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  return <>{children}</>;
};
