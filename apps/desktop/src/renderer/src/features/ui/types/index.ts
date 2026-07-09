import { LucideIcon } from "lucide-react";

export type NavigationView = "queue" | "library" | "channel-sync" | "settings";

export interface SidebarItem {
  readonly id: NavigationView;
  readonly label: string;
  readonly count?: number;
  readonly icon: LucideIcon;
}
