import { Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { cn } from "@vault/ui/lib/utils";

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

interface PlayerWindowButtonsProps {
  isExpanded: boolean;
  toggleExpanded: () => void;
  closeMedia: () => void;
  className?: string;
}

export const PlayerWindowButtons = ({
  isExpanded,
  toggleExpanded,
  closeMedia,
  className
}: PlayerWindowButtonsProps) => {
  const glassButton = cn(
    `h-8 w-8 rounded-full border border-border bg-background/60 text-foreground shadow-lg backdrop-blur-xl transition-all duration-300 ${EASE}`,
    "hover:scale-110 hover:bg-background/80 active:scale-95"
  );
  const glassCloseButton = cn(
    `h-8 w-8 rounded-full border border-border bg-background/60 text-foreground shadow-lg backdrop-blur-xl transition-all duration-300 ${EASE}`,
    "hover:scale-110 hover:bg-destructive hover:text-destructive-foreground active:scale-95"
  );

  return (
    <div className={cn("absolute right-3 top-3 flex items-center gap-1.5", className)}>
      <Button variant="secondary" size="icon" className={glassButton} onClick={toggleExpanded}>
        {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </Button>
      <Button variant="secondary" size="icon" className={glassCloseButton} onClick={closeMedia}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
