import { Repeat } from "lucide-react";
import { Switch } from "@vault/ui/components/switch";
import { cn } from "@vault/ui/lib/utils";

interface LoopToggleProps {
  isLooping: boolean;
  onToggle: (value: boolean) => void;
}

export const LoopToggle = ({ isLooping, onToggle }: LoopToggleProps) => {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <Repeat
        className={cn(
          "h-3.5 w-3.5 transition-colors duration-300",
          isLooping ? "text-primary" : "text-muted-foreground"
        )}
      />
      <Switch checked={isLooping} onCheckedChange={onToggle} />
    </label>
  );
};
