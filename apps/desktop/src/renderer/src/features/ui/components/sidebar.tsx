import { HardDrive, Library, Layers, Moon, Rss, Settings2, Sun } from "lucide-react";
import { useNavigation } from "../../../providers/navigation-provider";
import type { SidebarItem } from "../types";
import { useTheme } from "@renderer/providers/theme-provider";
import { Button } from "@vault/ui/components/button";

const sidebarItems: SidebarItem[] = [
  { id: "queue", label: "Queue", count: 4, icon: Layers },
  { id: "library", label: "Library", count: 9, icon: Library },
  { id: "channel-sync", label: "Channel Sync", count: 2, icon: Rss },
  { id: "settings", label: "Settings", icon: Settings2 }
];

export const SideBar = () => {
  const { currentView, navigate } = useNavigation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-sidebar-border bg-sidebar">
      <nav className="flex flex-col gap-0.5 px-2 pt-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
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
                {item.count !== undefined && (
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                      active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.count}
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
          <span className="font-mono tabular-nums">482 GB free</span>
        </div>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: "62%" }} />
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
