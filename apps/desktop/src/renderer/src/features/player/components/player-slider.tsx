import { Slider } from "@vault/ui/components/slider";
import { cn } from "@vault/ui/lib/utils";

interface PlayerSliderProps {
  value: number[];
  max: number;
  step?: number;
  onValueChange: (value: number[]) => void;
  className?: string;
}

/**
 * Draws its OWN track so the line is always visible (theme-aware),
 * and tags itself `.js-no-drag` so the window-drag handler never hijacks seeks.
 */
export const PlayerSlider = ({
  value,
  max,
  step = 0.1,
  onValueChange,
  className
}: PlayerSliderProps) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value[0] / max) * 100)) : 0;

  return (
    <div className="group/ps relative flex h-4 items-center js-no-drag">
      {/* Unfilled track */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground/20 transition-all group-hover/ps:h-1.5",
          className
        )}
      />
      {/* Filled / played track */}
      <div
        className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary transition-all group-hover/ps:h-1.5"
        style={{ width: `${pct}%` }}
      />

      <Slider
        value={value}
        max={max}
        step={step}
        onValueChange={(value) => {
          onValueChange(Array.isArray(value) ? [...value] : [value]);
        }}
        className={cn(
          "relative z-10 w-full bg-transparent",
          "[&>span:first-child]:bg-transparent [&>span:first-child>span]:bg-transparent",
          "[&>[data-slot=slider-track]]:bg-transparent [&>[data-slot=slider-range]]:bg-transparent",
          "[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:rounded-full",
          "[&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary-foreground",
          "[&_[role=slider]]:shadow-md [&_[role=slider]]:transition-transform [&_[role=slider]]:hover:scale-125",
          "[&_[data-slot=slider-thumb]]:h-3.5 [&_[data-slot=slider-thumb]]:w-3.5 [&_[data-slot=slider-thumb]]:rounded-full",
          "[&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-primary [&_[data-slot=slider-thumb]]:bg-primary-foreground"
        )}
      />
    </div>
  );
};
