import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { formatDuration } from "@/lib/utils/format";
import { PlayerSlider } from "./player-slider";
import { EqualizerBars } from "./equalizer-bars";
import { LoopToggle } from "./loop-toggle";

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
  muteButton: React.ReactNode;
  volumeReveal: React.ReactNode;
}

export const PlayerControls = ({
  title,
  channel,
  isPlaying,
  isBuffering,
  isLooping,
  progress,
  duration,
  onSeek,
  onTogglePlay,
  onToggleLoop,
  muteButton,
  volumeReveal
}: PlayerControlsProps) => {
  return (
    <>
      <div className="min-w-0 space-y-1 text-center">
        <p className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
          {isPlaying && <EqualizerBars active />}
          Now Playing
        </p>
        <p className="truncate text-base font-semibold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{channel}</p>
      </div>

      <div className="space-y-1.5">
        <PlayerSlider
          value={[progress]}
          max={duration > 0 ? duration : 100}
          onValueChange={onSeek}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {formatDuration(progress)}
          </span>
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {duration > 0 ? formatDuration(duration) : "--:--"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full text-muted-foreground transition-all duration-300 ${EASE} hover:scale-110 hover:text-foreground active:scale-90`}
          onClick={() => onSeek(Math.max(0, progress - 10))}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <div className="relative flex items-center justify-center">
          {isPlaying && (
            <span className="absolute h-12 w-12 animate-[ring-pulse_2s_ease-out_infinite] rounded-full bg-primary/40" />
          )}
          <Button
            size="icon"
            className={`relative h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-[0_5px_5px_-5px_var(--primary)] ring-1 ring-inset ring-primary-foreground/25 transition-all duration-300 ${EASE} hover:scale-110 active:scale-90`}
            onClick={onTogglePlay}
          >
            {isBuffering ? (
              <EqualizerBars active />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            )}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full text-muted-foreground transition-all duration-300 ${EASE} hover:scale-110 hover:text-foreground active:scale-90`}
          onClick={() => onSeek(Math.min(duration || 0, progress + 10))}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-6">
        <LoopToggle isLooping={isLooping} onToggle={onToggleLoop} />
        <div className="group/vol relative flex items-center">
          {muteButton}
          {volumeReveal}
        </div>
      </div>
    </>
  );
};
