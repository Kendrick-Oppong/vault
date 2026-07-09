import "./styles/globals.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { NavigationProvider } from "@renderer/providers/navigation-provider";
import { ThemeProvider } from "@/providers/theme-provider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <NavigationProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vault-ui-theme">
          <App />
        </ThemeProvider>
      </NavigationProvider>
      <ToastProvider />
    </QueryProvider>
  </StrictMode>
);
