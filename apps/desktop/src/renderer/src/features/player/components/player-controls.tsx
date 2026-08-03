import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { formatDuration } from "@/lib/utils/format";
import { PlayerSlider } from "./player-slider";
import { EqualizerBars } from "./equalizer-bars";
import { LoopToggle } from "./loop-toggle";
import { VolumeControl } from "./volume-control";

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

interface PlayerControlsProps {
  title: string;
  channel: string;
  isPlaying: boolean;
  isBuffering: boolean;
  isLooping: boolean;
  progress: number;
  duration: number;
  onSeek: (value: number | readonly number[]) => void;
  onTogglePlay: () => void;
  onToggleLoop: (value: boolean) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  isExpanded: boolean;
}

export const PlayerControls = (props: PlayerControlsProps) => {
  return (
    <>
      <div className="min-w-0 space-y-1 text-center">
        <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
          {props.isPlaying && <EqualizerBars active />}
          Now Playing
        </div>

        <p
          className={`truncate text-lg font-semibold text-foreground ${
            props.isExpanded && "text-background! dark:text-foreground!"
          }`}
        >
          {props.title}
        </p>

        <p
          className={`truncate text-xs text-muted-foreground ${
            props.isExpanded && "text-background! dark:text-foreground!"
          }`}
        >
          {props.channel}
        </p>
      </div>

      <div className="space-y-1.5">
        <PlayerSlider
          value={[props.progress]}
          max={props.duration > 0 ? props.duration : 100}
          onValueChange={props.onSeek}
          className={`${props.isExpanded && "bg-background/20! dark:bg-foreground/20!"}`}
        />

        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-medium tabular-nums text-muted-foreground ${
              props.isExpanded && "text-background! dark:text-foreground!"
            }`}
          >
            {formatDuration(props.progress)}
          </span>

          <span
            className={`text-[10px] font-medium tabular-nums text-muted-foreground ${
              props.isExpanded && "text-background! dark:text-foreground!"
            }`}
          >
            {props.duration > 0 ? formatDuration(props.duration) : "--:--"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full text-muted-foreground transition-all duration-300 ${EASE} hover:scale-110 hover:text-foreground active:scale-90 ${
            props.isExpanded &&
            "text-background! dark:text-foreground! hover:bg-foreground/20! dark:hover:bg-foreground/20!"
          }`}
          onClick={() => props.onSeek(Math.max(0, props.progress - 10))}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <div className="relative flex items-center justify-center">
          {props.isPlaying && (
            <span className="absolute h-12 w-12 animate-[ring-pulse_2s_ease-out_infinite] rounded-full bg-primary/40" />
          )}

          <Button
            size="icon"
            className={`relative h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-[0_5px_5px_-5px_var(--primary)] ring-1 ring-inset ring-primary-foreground/25 transition-all duration-300 ${EASE} hover:scale-110 active:scale-90 ${
              props.isExpanded && "text-background! dark:text-foreground!"
            }`}
            onClick={props.onTogglePlay}
          >
            {props.isBuffering ? (
              <EqualizerBars active />
            ) : props.isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            )}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full text-muted-foreground transition-all duration-300 ${EASE} hover:scale-110 hover:text-foreground active:scale-90 ${
            props.isExpanded &&
            "text-background! dark:text-foreground! hover:bg-foreground/20! dark:hover:bg-foreground/20!"
          }`}
          onClick={() => props.onSeek(Math.min(props.duration || 0, props.progress + 10))}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-6">
        <LoopToggle
          isLooping={props.isLooping}
          onToggle={props.onToggleLoop}
          className={`${props.isExpanded && "text-background! dark:text-foreground!"}`}
        />

        <VolumeControl
          volume={props.volume}
          isMuted={props.isMuted}
          isExpanded={props.isExpanded}
          onVolumeChange={props.onVolumeChange}
          onToggleMute={props.onToggleMute}
        />
      </div>
    </>
  );
};
