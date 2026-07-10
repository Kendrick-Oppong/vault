import { Button } from "@vault/ui/components/button";
import { CheckSquare, Square } from "lucide-react";

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onBulkAction: (action: "pause" | "resume" | "retry" | "cancel") => void;
}

export const BulkActions = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onSelectNone,
  onBulkAction
}: BulkActionsProps) => {
  if (selectedCount === 0) return null;

  const isAllSelected = selectedCount === totalCount;

  return (
    <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-secondary/60 border border-border">
      <span className="text-[12px] text-muted-foreground">{selectedCount} selected</span>

      <div className="flex items-center gap-0.5">
        {isAllSelected ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectNone}
            className="text-[12px] text-muted-foreground h-auto px-2 py-1 flex items-center gap-1.5 hover:text-foreground"
          >
            <Square className="w-3.5 h-3.5" />
            Deselect all
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="text-[12px] text-primary h-auto px-2 py-1 flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Select all
          </Button>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkAction("pause")}
          className="px-2.5 py-1.5 text-[12px] h-auto hover:border-primary hover:text-primary"
        >
          Pause
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkAction("resume")}
          className="px-2.5 py-1.5 text-[12px] h-auto hover:border-primary hover:text-primary"
        >
          Resume
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkAction("retry")}
          className="px-2.5 py-1.5 text-[12px] h-auto hover:border-primary hover:text-primary"
        >
          Retry
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onBulkAction("cancel")}
          className="px-2.5 py-1.5 text-[12px] h-auto hover:border-destructive hover:text-destructive"
        >
          Remove
        </Button>
      </div>
    </div>
  );
};
