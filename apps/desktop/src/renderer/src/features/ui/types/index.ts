import { NavigationView } from "@/stores/navigation/navigation.store";
import { LucideIcon } from "lucide-react";

export interface SidebarItem {
  readonly id: NavigationView;
  readonly label: string;
  readonly count?: number;
  readonly icon: LucideIcon;
}
