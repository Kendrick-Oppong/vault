import { useState } from "react";
import { Volume, Volume1, Volume2, VolumeX } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@vault/ui/components/tooltip";
import { cn } from "@vault/ui/lib/utils";
import { PlayerSlider } from "./player-slider";

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  isExpanded: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
}

export const VolumeControl = ({
  volume,
  isMuted,
  isExpanded,
  onVolumeChange,
  onToggleMute
}: VolumeControlProps) => {
  const [isHovering, setIsHovering] = useState(false);

  const level = isMuted ? 0 : volume;
  const percent = Math.round(level * 100);

  const VolumeIcon =
    level === 0 ? VolumeX : level < 0.33 ? Volume : level < 0.66 ? Volume1 : Volume2;

  const handleSliderChange = (value: number | readonly number[]) => {
    const next = Array.isArray(value) ? value[0] : (value as number);
    onVolumeChange(next);
    if (next > 0 && isMuted) onToggleMute();
  };

  return (
    <div
      className="group/vol relative flex items-center"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          `h-8 w-8 rounded-full text-muted-foreground transition-all duration-300 ${EASE} hover:scale-110 hover:text-foreground active:scale-95`,
          isExpanded &&
            "text-background! dark:text-foreground! hover:bg-foreground/20! dark:hover:bg-foreground/20!"
        )}
        onClick={onToggleMute}
      >
        <VolumeIcon className="h-4 w-4" />
      </Button>

      <div
        className={cn(
          `items-center opacity-0 transition-all duration-300 ${EASE}`,
          "pointer-events-none w-0 group-hover/vol:pointer-events-auto group-hover/vol:w-24 group-hover/vol:opacity-100",
          "group-focus-within/vol:pointer-events-auto group-focus-within/vol:w-24 group-focus-within/vol:opacity-100",
          "ml-2"
        )}
      >
        <Tooltip open={isHovering}>
          <TooltipTrigger
            render={
              <div
                className="pointer-events-none absolute top-1 h-px w-px"
                style={{ left: `calc(${percent}% + ${10 - percent * 0.2}px)` }}
              />
            }
          />
          <TooltipContent
            side="top"
            align={percent < 15 ? "start" : percent > 85 ? "end" : "center"}
            sideOffset={8}
            className="bg-primary font-medium"
          >
            <span className="tabular-nums">{percent}%</span>
          </TooltipContent>
        </Tooltip>

        <PlayerSlider
          className={cn("w-full", isExpanded && "bg-background/20! dark:bg-foreground/20!")}
          step={0.01}
          value={[level]}
          max={1}
          onValueChange={handleSliderChange}
        />
      </div>
    </div>
  );
};
