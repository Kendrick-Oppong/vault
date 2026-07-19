import { Button } from "@vault/ui/components/button";
import { Checkbox } from "@vault/ui/components/checkbox";
import { ListOrdered, Video, ChevronDown, Loader2 } from "lucide-react";
import type { PlaylistItem } from "../types";

interface PlaylistItemsProps {
  items: PlaylistItem[];
  selectedItems: Set<string>;
  isLoadingMore: boolean;
  hasMoreItems: boolean;
  totalCount?: number;
  onToggleItem: (itemId: string) => void;
  onToggleAll: () => void;
  onLoadMore: () => void;
}

export const PlaylistItems = ({
  items,
  selectedItems,
  isLoadingMore,
  hasMoreItems,
  totalCount,
  onToggleItem,
  onToggleAll,
  onLoadMore
}: PlaylistItemsProps) => {
  const remainingItems = totalCount ? Math.max(0, totalCount - items.length) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <ListOrdered className="w-3.5 h-3.5" />
          Playlist items
        </p>
        <p className="text-[12px] text-muted-foreground">
          <span className="font-medium">{selectedItems.size}</span> of <span>{items.length}</span>{" "}
          selected
        </p>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Button
          variant="link"
          size="sm"
          className="text-[12px] text-primary h-auto p-0"
          onClick={onToggleAll}
        >
          {selectedItems.size === items.length ? "Deselect all" : "Select all"}
        </Button>
      </div>
      <div className="border border-border rounded-lg max-h-75 overflow-y-auto divide-y divide-border">
        {items.map((item, index) => (
          <label
            key={item.id}
            className="flex items-center gap-3 p-2.5 text-[12.5px] cursor-pointer hover:bg-accent/60 transition-colors"
          >
            <Checkbox
              checked={selectedItems.has(item.id)}
              onCheckedChange={() => onToggleItem(item.id)}
              className="w-4 h-4 shrink-0"
            />
            <span className="text-muted-foreground w-4 text-[12px] font-medium text-right shrink-0">
              {index + 1}
            </span>
            <div className="relative w-14 h-9 bg-secondary rounded flex items-center justify-center overflow-hidden shrink-0">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <Video className="w-3.5 h-3.5 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <span className="truncate font-medium">{item.title}</span>
              {item.duration && (
                <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                  {item.duration}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
      <div className="text-center">
        {hasMoreItems && (
          <Button size="sm" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading
              </>
            ) : (
              <>
                Load more ({remainingItems} remaining)
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
