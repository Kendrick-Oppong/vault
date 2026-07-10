import { Button } from "@vault/ui/components/button";
import { Input } from "@vault/ui/components/input";
import { cn } from "@vault/ui/lib/utils";
import { ArrowUpDown, Calendar, FileText, Search, SortAsc, SortDesc, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@vault/ui/components/dropdown-menu";
import type { LibrarySort, SortOrder } from "../types";

interface FilterTabsProps {
  sortBy: LibrarySort;
  sortOrder: SortOrder;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: LibrarySort) => void;
  onSortOrderChange: () => void;
}

const sortOptions: { id: LibrarySort; label: string; icon: React.ReactNode }[] = [
  { id: "title", label: "Title", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "date", label: "Date", icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: "size", label: "Size", icon: <ArrowUpDown className="w-3.5 h-3.5" /> }
];

export const FilterTabs = ({
  sortBy,
  sortOrder,
  searchQuery,
  onSearchChange,
  onSortChange,
  onSortOrderChange
}: FilterTabsProps) => {
  const currentSort = sortOptions.find((s) => s.id === sortBy);

  return (
    <div className="flex items-center gap-3 flex-1">
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search your library..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-11 flex-1 w-full text-sm rounded-lg shadow-card border-border-strong bg-secondary/60 focus-visible:bg-card transition-colors"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={(props) => (
            <Button
              {...props}
              variant="outline"
              size="sm"
              className="px-3 py-3 rounded-lg text-[12.5px] font-medium flex items-center gap-1.5 h-auto border-border hover:bg-secondary"
            >
              <Filter className="w-3.5 h-3.5" />
              {currentSort?.label}
              <span className="text-muted-foreground text-[10px]">
                {sortOrder === "asc" ? "↑" : "↓"}
              </span>
            </Button>
          )}
        />
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Sort by
          </div>
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => onSortChange(option.id)}
              className={cn(
                "flex items-center gap-2 text-[12px]",
                sortBy === option.id && "text-primary font-medium"
              )}
            >
              {option.icon}
              {option.label}
              {sortBy === option.id && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {sortOrder === "asc" ? "↑" : "↓"}
                </span>
              )}
            </DropdownMenuItem>
          ))}
          <div className="h-px bg-border my-1" />
          <DropdownMenuItem
            onClick={onSortOrderChange}
            className="flex items-center gap-2 text-[12px] text-muted-foreground"
          >
            {sortOrder === "asc" ? (
              <SortAsc className="w-3.5 h-3.5" />
            ) : (
              <SortDesc className="w-3.5 h-3.5" />
            )}
            {sortOrder === "asc" ? "Ascending" : "Descending"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
