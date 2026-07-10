import type { QueueItem as QueueItemType } from "../types";
import { QueueItem } from "./queue-item";
import { EmptyState } from "@/features/ui/components/empty-state";
import { Layers } from "lucide-react";

interface QueueListProps {
  items: QueueItemType[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onAction: (action: string, id: string) => void;
  onCopyLink: (id: string) => void;
  onOpenFolder: (id: string) => void;
}

export const QueueList = ({
  items,
  selectedIds,
  onSelect,
  onAction,
  onCopyLink,
  onOpenFolder
}: QueueListProps) => {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No items in queue"
        description="Paste a link in the search bar above to start downloading."
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <QueueItem
          key={item.id}
          item={item}
          isSelected={selectedIds.includes(item.id)}
          onSelect={onSelect}
          onAction={onAction}
          onCopyLink={onCopyLink}
          onOpenFolder={onOpenFolder}
        />
      ))}
    </div>
  );
};
