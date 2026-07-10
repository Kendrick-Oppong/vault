import "./styles/globals.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { useUIStore } from "@/stores/ui/ui.store";

// Apply the persisted theme synchronously before React renders to avoid a
// flash of unstyled / wrong-theme content.
useUIStore.getState().initializeTheme();

// Keep the system-theme listener alive for the lifetime of the app.
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
mediaQuery.addEventListener("change", () => {
  if (useUIStore.getState().theme === "system") {
    useUIStore.getState().initializeTheme();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <ToastProvider />
    </QueryProvider>
  </StrictMode>
);
