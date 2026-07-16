import { Button } from "@vault/ui/components/button";
import { Video, Music } from "lucide-react";
import { useFormatState, useFormatActions, useFormatPresets } from "@/stores/format/format.selectors";
import { cn } from "@vault/ui/lib/utils";

export const PresetButtons = () => {
  const { selectedPreset } = useFormatState();
  const { selectPreset } = useFormatActions();
  const presets = useFormatPresets();

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => {
        const isSelected = selectedPreset === preset.id;
        const Icon = preset.icon === "video" ? Video : Music;

        return (
          <Button
            key={preset.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => selectPreset(preset.id)}
            className={cn(
              "text-[12px] flex items-center gap-1.5 h-8",
              isSelected && "bg-primary text-primary-foreground"
            )}
            title={preset.description}
          >
            <Icon className="w-3.5 h-3.5" />
            {preset.name}
          </Button>
        );
      })}
    </div>
  );
};
