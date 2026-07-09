import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { NavigationView } from "../types";

interface NavigationContextValue {
  readonly currentView: NavigationView;
  readonly navigate: (view: NavigationView) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [currentView, setCurrentView] = useState<NavigationView>("queue");

  const value = useMemo(
    () => ({
      currentView,
      navigate: setCurrentView
    }),
    [currentView]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNavigation() {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }

  return context;
}
