import { Button } from "@vault/ui/components/button";
import { cn } from "@vault/ui/lib/utils";
import { Pause } from "lucide-react";
import type { QueueFilter, QueueStats } from "../types";

interface FilterTabsProps {
  activeFilter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
  stats: QueueStats;
  onPauseAll?: () => void;
}

const filters: { id: QueueFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "downloading", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "queued", label: "Queued" },
  { id: "error", label: "Failed" }
];

export const FilterTabs = ({
  activeFilter,
  onFilterChange,
  stats,
  onPauseAll
}: FilterTabsProps) => {
  const getCount = (filter: QueueFilter) => {
    switch (filter) {
      case "all":
        return stats.total;
      case "downloading":
        return stats.downloading;
      case "paused":
        return stats.paused;
      case "queued":
        return stats.queued;
      case "error":
        return stats.error;
    }
  };

  return (
    <div className="flex items-center gap-1 mb-4">
      {filters.map((filter) => {
        const count = getCount(filter.id);
        const isActive = activeFilter === filter.id;

        return (
          <Button
            key={filter.id}
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className={cn(
              "px-3 py-1.5 shadow-card rounded-lg text-[12.5px] font-medium flex items-center gap-1.5 h-auto",
              isActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {filter.label}
            <span
              className={cn(
                "text-[11px] font-semibold -translate-y-1",
                isActive ? "text-foreground" : "opacity-60"
              )}
            >
              {count}
            </span>
          </Button>
        );
      })}

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onPauseAll}
        className="text-[12px] text-muted-foreground hover:text-foreground px-2 py-1 h-auto"
      >
        <Pause className="w-3 h-3 mr-1" />
        Pause all
      </Button>
    </div>
  );
};
