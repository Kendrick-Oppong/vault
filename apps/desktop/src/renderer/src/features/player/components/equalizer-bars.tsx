import { cn } from "@vault/ui/lib/utils";

interface EqualizerBarsProps {
  active: boolean;
  size?: "sm" | "lg";
}

export const EqualizerBars = ({ active, size = "sm" }: EqualizerBarsProps) => {
  const heights = size === "lg" ? [10, 18, 14, 20] : [5, 9, 7, 10];

  return (
    <div className={cn("flex items-end gap-[3px]", size === "lg" ? "h-5" : "h-2.5")}>
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-current",
            active ? "animate-[eq-bar_0.9s_ease-in-out_infinite]" : "opacity-40"
          )}
          style={{
            height: active ? undefined : `${h * 0.4}px`,
            animationDelay: `${i * 0.12}s`,
            ["--bar-h" as string]: `${h}px`
          }}
        />
      ))}
    </div>
  );
};
