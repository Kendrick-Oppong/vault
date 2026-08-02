import { X } from "lucide-react";
import { Button } from "@vault/ui/components/button";

interface PlayerErrorStateProps {
  error: string;
  onClose: () => void;
  isExpanded: boolean;
}

export const PlayerErrorState = ({ error, onClose, isExpanded }: PlayerErrorStateProps) => {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 ${isExpanded && "text-background! dark:text-foreground! bg-destructive/70!"}`}
      >
        <X className="h-5 w-5 text-destructive" />
      </div>
      <p
        className={`max-w-[90%] break-words text-xs ${isExpanded ? "text-background! dark:text-foreground!" : "text-muted-foreground"}`}
      >
        {error}
      </p>
      <Button
        variant="outline"
        size="sm"
        className={`rounded-full px-4 ${isExpanded && "bg-background! dark:bg-foreground! dark:text-background!"}`}
        onClick={onClose}
      >
        Close player
      </Button>
    </div>
  );
};
