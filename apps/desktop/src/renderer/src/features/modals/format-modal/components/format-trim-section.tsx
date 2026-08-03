import { useState } from "react";
import { Slider } from "@vault/ui/components/slider";
import { Checkbox } from "@vault/ui/components/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@vault/ui/components/tooltip";
import { Scissors } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";
import { formatDuration, parseDurationToSeconds } from "@/lib/utils/format";

interface FormatTrimSectionProps {
  duration?: string;
  trimRange: { start?: string; end?: string };
  onTrimRangeChange: (range: { start?: string; end?: string }) => void;
  frameAccurate: boolean;
  onFrameAccurateChange: (value: boolean) => void;
}

export const FormatTrimSection = ({
  duration,
  trimRange,
  onTrimRangeChange,
  frameAccurate,
  onFrameAccurateChange
}: FormatTrimSectionProps) => {
  const totalSeconds = parseDurationToSeconds(duration);
  const [isHovering, setIsHovering] = useState(false);

  if (!duration || totalSeconds <= 0) {
    return null;
  }

  const currentStartSec = trimRange.start ? parseDurationToSeconds(trimRange.start) : 0;
  const currentEndSec = trimRange.end ? parseDurationToSeconds(trimRange.end) : totalSeconds;
  const clipLength = currentEndSec - currentStartSec;
  const isEmptyClip = clipLength <= 0;

  const handleSliderChange = (value: number | readonly number[]) => {
    const [startSec, endSec] = value as number[];
    const newStart = startSec > 0 ? formatDuration(startSec) : "";
    const newEnd = endSec < totalSeconds ? formatDuration(endSec) : "";
    onTrimRangeChange({ start: newStart, end: newEnd });
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
          Crop / Trim
        </p>
      </div>

      <div className="space-y-4 bg-secondary/30 border border-border/50 rounded-xl p-4">
        <div
          className="relative px-3 pt-6"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {[currentStartSec, currentEndSec].map((sec, i) => {
            const percent = (sec / totalSeconds) * 100;
            const isFirst = i === 0;
            return (
              <Tooltip key={`thumb-${i}`} open={isHovering}>
                <TooltipTrigger
                  render={
                    <div
                      className="pointer-events-none absolute top-6 h-px w-px"
                      style={{ left: `calc(${percent}% + ${10 - percent * 0.2}px)` }}
                    />
                  }
                />
                <TooltipContent
                  side="top"
                  align={isFirst ? "start" : "end"}
                  sideOffset={8}
                  className="bg-primary h-6 text-primary-foreground font-medium *:last:hidden"
                >
                  {formatDuration(sec) || "0:00"}
                </TooltipContent>
              </Tooltip>
            );
          })}

          <Slider
            min={0}
            max={totalSeconds}
            step={1}
            value={[currentStartSec, currentEndSec]}
            onValueChange={handleSliderChange}
            className="w-full cursor-pointer"
            aria-label="Trim range"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-medium">{formatDuration(currentStartSec) || "0:00"}</span>

          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              isEmptyClip ? "bg-destructive/10 text-destructive" : "bg-foreground/5 text-foreground"
            )}
          >
            <Scissors className="h-3 w-3" />
            {isEmptyClip ? "Select a range" : `${formatDuration(clipLength)} clip`}
          </span>

          <span className="font-medium">{formatDuration(currentEndSec) || "0:00"}</span>
        </div>

        <label className="flex cursor-pointer items-start gap-2 pt-1 text-[12px] text-muted-foreground">
          <Checkbox
            checked={frameAccurate}
            onCheckedChange={(checked) => onFrameAccurateChange(!!checked)}
            className="mt-0.5 h-3.5 w-3.5"
          />
          <span className="font-medium">
            Frame-accurate cut{" "}
            <span className="text-muted-foreground">
              (precise start/end, but slower & CPU-intensive)
            </span>
          </span>
        </label>
      </div>

      <p className="text-center text-[11px] font-medium text-muted-foreground">
        {frameAccurate
          ? "Precise cuts, but the clip is re-encoded — processing takes longer."
          : "Fast cuts that snap to the nearest keyframe — may start/end 1-3s off. Enable frame-accurate for exact cuts."}
      </p>
    </div>
  );
};
