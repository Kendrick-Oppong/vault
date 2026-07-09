import { Button } from "@vault/ui/components/button";
import { Library, ListOrdered, RefreshCw, Settings } from "lucide-react";
import { useNavigation } from "../contexts/navigation-context";
import type { SidebarItem } from "../types";

const sidebarItems: SidebarItem[] = [
  {
    id: "queue",
    label: "Queue",
    count: 2,
    icon: ListOrdered
  },
  {
    id: "library",
    label: "Library",
    count: 4,
    icon: Library
  },
  {
    id: "channel-sync",
    label: "Channel Sync",
    count: 1,
    icon: RefreshCw
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings
  }
];

export const SideBar = () => {
  const { currentView, navigate } = useNavigation();

  return (
    <aside className="flex flex-col gap-1">
      {sidebarItems.map((item) => {
        const Icon = item.icon;

        return (
          <Button
            key={item.id}
            variant={currentView === item.id ? "secondary" : "ghost"}
            className="h-10 w-full justify-between"
            onClick={() => navigate(item.id)}
          >
            <div className="flex items-center gap-3">
              <Icon className="size-4" />
              <span>{item.label}</span>
            </div>

            {item.count !== undefined && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {item.count}
              </span>
            )}
          </Button>
        );
      })}
    </aside>
  );
};
