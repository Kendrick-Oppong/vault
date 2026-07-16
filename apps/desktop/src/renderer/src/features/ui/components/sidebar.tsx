import { Library, Layers, Moon, Settings2, Sun, ScrollText } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { useNavigationState } from "@/stores/navigation/navigation.selectors";
import { useUIState } from "@/stores/ui/ui.selectors";
import { StorageIndicator } from "@/features/ui/components/storage-indicator";
import type { SidebarItem } from "../types";
import type { NavigationView } from "@/stores/navigation/navigation.store";

const sidebarItems: SidebarItem[] = [
  { id: "queue", label: "Queue", icon: Layers },
  { id: "library", label: "Library", icon: Library },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "settings", label: "Settings", icon: Settings2 }
];

import { useActiveJobs } from "@/lib/queries/jobs";
import { useHistory } from "@/lib/queries/history";

export const SideBar = () => {
  const { currentView, navigate } = useNavigationState();
  const { theme, setTheme } = useUIState();
  const isDark = theme === "dark";

  // Fetch real counts
  const { data: activeJobs = [] } = useActiveJobs();
  const { data: history = [] } = useHistory();

  const getCount = (id: NavigationView) => {
    switch (id) {
      case "queue":
        return activeJobs.length || undefined;
      case "library":
        return history.length || undefined;
      default:
        return undefined;
    }
  };

  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-sidebar-border bg-sidebar">
      <nav className="flex flex-col gap-0.5 px-2 pt-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          const count = getCount(item.id);
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => navigate(item.id)}
              className={`group relative h-10 w-full justify-between rounded-md pl-3 pr-2 text-sm font-normal transition-colors duration-150 ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </span>
              {count !== undefined && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-medium text-primary">
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="mt-auto flex flex-col gap-2 px-2 pb-4 pt-2">
        {/* Storage indicator */}
        <StorageIndicator />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="h-8 w-8 rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
};
