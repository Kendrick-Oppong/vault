import { HardDrive, Library, Layers, Moon, Settings2, Sun } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { useNavigationState } from "@/stores/navigation/navigation.selectors";
import { useUIState } from "@/stores/ui/ui.selectors";
import { useSystemAlertsState } from "@/stores/system-alerts/system-alerts.selectors";
import type { SidebarItem } from "../types";

const sidebarItems: SidebarItem[] = [
  { id: "queue", label: "Queue", icon: Layers },
  { id: "library", label: "Library", icon: Library },
  { id: "settings", label: "Settings", icon: Settings2 }
];

import { useActiveJobs } from "@/lib/queries/jobs";
import { useHistory } from "@/lib/queries/history";

export const SideBar = () => {
  const { currentView, navigate } = useNavigationState();
  const { theme, setTheme } = useUIState();
  const { diskSpaceFree } = useSystemAlertsState();
  const isDark = theme === "dark";

  // Fetch real counts
  const { data: activeJobs = [] } = useActiveJobs();
  const { data: history = [] } = useHistory();

  // Format disk space display (bytes to GB)
  const formatDiskSpace = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB free`;
  };

  // Calculate storage percentage used
  const totalDiskSpace = 512 * 1024 * 1024 * 1024; // Assuming 512 GB total (user can override this)
  const usedPercent = Math.round(((totalDiskSpace - diskSpaceFree) / totalDiskSpace) * 100);

  const getCount = (id: string) => {
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
                  ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
              )}

              <span className="flex items-center gap-3">
                <Icon
                  className={
                    active
                      ? "size-[17px] shrink-0 text-primary"
                      : "size-[17px] shrink-0 text-muted-foreground group-hover:text-sidebar-accent-foreground"
                  }
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span className={`tracking-normal ${active ? "font-medium" : ""}`}>
                  {item.label}
                </span>
              </span>

              <span className="flex items-center gap-1.5">
                {count !== undefined && (
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                      active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </span>
            </Button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-sidebar-border px-4 py-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <HardDrive className="size-3.5" />
            Storage
          </span>
          <span className="font-mono tabular-nums">{formatDiskSpace(diskSpaceFree)}</span>
        </div>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-colors ${
              usedPercent > 80 ? "bg-destructive" : "bg-primary"
            }`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>

        <Button
          variant="ghost"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="mt-4 h-9 w-full justify-start gap-2.5 px-2 text-sm font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {isDark ? (
            <Sun className="size-4" strokeWidth={1.75} />
          ) : (
            <Moon className="size-4" strokeWidth={1.75} />
          )}
          {isDark ? "Light mode" : "Dark mode"}
        </Button>
      </div>
    </aside>
  );
};
