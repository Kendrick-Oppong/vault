import { Repeat } from "lucide-react";
import { Switch } from "@vault/ui/components/switch";
import { cn } from "@vault/ui/lib/utils";

interface LoopToggleProps {
  isLooping: boolean;
  onToggle: (value: boolean) => void;
  className?: string;
}

export const LoopToggle = ({ isLooping, onToggle, className }: LoopToggleProps) => {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <Repeat
        className={cn(
          "h-3.5 w-3.5 transition-colors duration-300",
          isLooping ? "text-primary" : "text-muted-foreground",
          className
        )}
      />
      <Switch checked={isLooping} onCheckedChange={onToggle} />
    </label>
  );
};
