import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX, Music } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { usePlayerStore } from "@/stores/player/player.store";
import { usePlayerActions } from "@/stores/player/player.selectors";
import { cn } from "@vault/ui/lib/utils";
import { PlayerSlider } from "./player-slider";
import { EqualizerBars } from "./equalizer-bars";
import { PlayerWindowButtons } from "./player-window-buttons";
import { PlayerErrorState } from "./player-error-state";
import { PlayerControls } from "./player-controls";

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export const GlobalPlayer = () => {
  const { currentMedia, isPlaying, isPiP, volume, isMuted, isExpanded } = usePlayerStore();
  const { setIsPlaying, closeMedia, toggleExpanded, setVolume, toggleMute } = usePlayerActions();

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Floating-window drag
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [pointerActive, setPointerActive] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragMoved = useRef(false);
  const suppressClick = useRef(false);

  /* ── Adjust state during render (NOT in effects) ──
     This is React's blessed pattern for "reset when an id changes". */
  const [trackedId, setTrackedId] = useState(currentMedia?.id);
  if (currentMedia?.id !== trackedId) {
    setTrackedId(currentMedia?.id);
    setError(null);
    setIsBuffering(false);
    setProgress(0);
    setDuration(0);
  }

  const [trackedPath, setTrackedPath] = useState(currentMedia?.filePath);
  if (currentMedia?.filePath !== trackedPath) {
    setTrackedPath(currentMedia?.filePath);
    setMediaSrc(null);
  }

  /* ── Resolve media URL (async external source → effect is correct here) ── */
  useEffect(() => {
    if (!currentMedia?.filePath) return;
    let cancelled = false;
    globalThis.api.getMediaUrl(currentMedia.filePath).then((url) => {
      if (!cancelled) setMediaSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [currentMedia?.filePath]);

  // Sync volume / mute to the element
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
      mediaRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Global media keys
  useEffect(() => {
    if (!currentMedia) return;
    const unsubPlayPause = globalThis.api.onMediaPlayPause(() => {
      setIsPlaying(!usePlayerStore.getState().isPlaying);
    });
    const unsubNext = globalThis.api.onMediaNextTrack(() => {});
    const unsubPrev = globalThis.api.onMediaPreviousTrack(() => {});
    return () => {
      unsubPlayPause();
      unsubNext();
      unsubPrev();
    };
  }, [currentMedia, setIsPlaying]);

  /* ── Drag: one effect, keyed on pointerActive.
     Listeners are added on mousedown, removed on mouseup OR unmount.
     No forward references, no manual useCallback → React-Compiler friendly. ── */
  useEffect(() => {
    if (!pointerActive) return;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartMouse.current.x;
      const dy = e.clientY - dragStartMouse.current.y;
      if (!draggingRef.current && Math.hypot(dx, dy) > 4) {
        draggingRef.current = true;
        dragMoved.current = true;
        setIsDragging(true);
      }
      if (draggingRef.current) {
        setPosition({ x: dragStartPos.current.x + dx, y: dragStartPos.current.y + dy });
      }
    };

    const onUp = () => {
      if (dragMoved.current) {
        suppressClick.current = true;
        setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
      draggingRef.current = false;
      dragMoved.current = false;
      setIsDragging(false);
      setPointerActive(false);
    };

    globalThis.addEventListener("mousemove", onMove);
    globalThis.addEventListener("mouseup", onUp);
    return () => {
      globalThis.removeEventListener("mousemove", onMove);
      globalThis.removeEventListener("mouseup", onUp);
    };
  }, [pointerActive]);

  const handleTimeUpdate = () => {
    const el = mediaRef.current;
    if (!el) return;
    setProgress(el.currentTime);
    if (el.duration && !Number.isNaN(el.duration) && Number.isFinite(el.duration)) {
      setDuration(el.duration);
    }
  };

  const handleLoadedMetadata = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.duration && !Number.isNaN(el.duration) && Number.isFinite(el.duration)) {
      setDuration(el.duration);
    }
  };

  const handleCanPlay = useCallback(() => {
    if (mediaRef.current && usePlayerStore.getState().isPlaying) {
      mediaRef.current.play().catch(() => {
        setIsPlaying(false);
        setError("Failed to play media");
      });
    }
  }, [setIsPlaying]);

  const handleTogglePlay = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const el = mediaRef.current;
    if (!el) return;
    const next = !usePlayerStore.getState().isPlaying;
    setIsPlaying(next);
    if (next) {
      el.play().catch(() => {
        setIsPlaying(false);
        setError("Failed to play media");
      });
    } else {
      el.pause();
    }
  };

  const handleSeek = (value: number | readonly number[]) => {
    const time = Array.isArray(value) ? value[0] : (value as number);
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isExpanded) return;
    if ((e.target as HTMLElement).closest("button, [role=slider], input, a, .js-no-drag, video"))
      return;
    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { ...position };
    draggingRef.current = false;
    dragMoved.current = false;
    setPointerActive(true);
  };

  if (!currentMedia || !currentMedia.filePath) return null;

  const isAudio = currentMedia.type === "music";
  const thumb = currentMedia.thumbnail;

  const artPad = isExpanded ? "p-10" : "p-6";
  const artMax = isExpanded ? "max-w-[420px]" : "max-w-[240px]";

  const volumeReveal = (
    <div
      className={cn(
        `flex h-4 items-center opacity-0 transition-all duration-300 ${EASE}`,
        "pointer-events-none w-0 group-hover/vol:pointer-events-auto group-hover/vol:w-24 group-hover/vol:opacity-100",
        "group-focus-within/vol:pointer-events-auto group-focus-within/vol:w-24 group-focus-within/vol:opacity-100",
        "left-full ml-2"
      )}
    >
      <PlayerSlider
        className="w-full"
        step={0.01}
        value={[isMuted ? 0 : volume]}
        max={1}
        onValueChange={(v) => {
          setVolume(v[0]);
          if (v[0] > 0 && isMuted) toggleMute();
        }}
      />
    </div>
  );

  const muteButton = (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 rounded-full text-muted-foreground transition-all duration-300 ${EASE} hover:scale-110 hover:text-foreground active:scale-95`}
      onClick={toggleMute}
    >
      {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );

  /* ── Hero media area: album art for audio, the video element for video.
     Same frame, same window buttons, same aspect-ratio behavior. ── */
  const hero = isAudio ? (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        isExpanded ? "min-h-0 flex-1" : "aspect-square max-h-[300px] shrink-0"
      )}
    >
      {/* Blurred, saturated backdrop */}
      {thumb ? (
        <img
          src={thumb}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-150 object-cover blur-lg saturate-150"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-primary/10" />
      )}

      {/* Ambient glow — breathes gently behind the art while playing */}
      {thumb && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center",
            isPlaying && "animate-[breathe-glow_4s_ease-in-out_infinite]"
          )}
        >
          <div className="aspect-square w-[70%] rounded-full bg-[radial-gradient(circle,var(--primary)_0%,transparent_70%)] opacity-60 blur-3xl" />
        </div>
      )}

      {/* Framed art */}
      <div className={cn("absolute inset-0 flex items-center justify-center", artPad)}>
        {thumb ? (
          <div
            className={cn(
              `group/art relative aspect-square w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-inset ring-border-strong transition-transform duration-700`,
              EASE,
              artMax,
              isPlaying && "scale-[1.02]"
            )}
          >
            <img src={thumb} alt={currentMedia.title} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div
            className={cn(
              "relative flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-muted/40 shadow-inner backdrop-blur-xl",
              artMax
            )}
          >
            <Music className="h-10 w-10 text-muted-foreground/40" />
            {isPlaying && <EqualizerBars active size="lg" />}
          </div>
        )}
      </div>

      <PlayerWindowButtons
        isExpanded={isExpanded}
        toggleExpanded={toggleExpanded}
        closeMedia={closeMedia}
        className="z-30"
      />

      {mediaSrc && (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={mediaSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            const err = (e.target as HTMLAudioElement).error;
            setError(`Failed to load audio (code ${err?.code})`);
          }}
        >
          <track kind="captions" />
        </audio>
      )}
    </div>
  ) : (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-black",
        isExpanded ? "min-h-0 flex-1" : "aspect-video shrink-0"
      )}
    >
      {mediaSrc && (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={mediaSrc}
          className="h-full w-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            const err = (e.target as HTMLVideoElement).error;
            setError(`Failed to load video (code ${err?.code})`);
          }}
          onClick={handleTogglePlay}
        >
          <track kind="captions" />
        </video>
      )}

      {!error && !isPlaying && !isBuffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border-strong bg-background/15 shadow-2xl backdrop-blur-md">
            <Play className="ml-1 h-7 w-7 fill-foreground text-foreground" />
          </div>
        </div>
      )}

      {!error && isBuffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border-strong bg-background/60 shadow-xl backdrop-blur-md">
            <EqualizerBars active size="lg" />
          </div>
        </div>
      )}

      <PlayerWindowButtons
        isExpanded={isExpanded}
        toggleExpanded={toggleExpanded}
        closeMedia={closeMedia}
        className="z-30"
      />
    </div>
  );

  return (
    <div
      className={cn(
        `flex select-none flex-col overflow-hidden border border-border bg-card transition-shadow duration-500 ${EASE}`,
        isExpanded
          ? "fixed inset-0 z-50 h-screen w-screen cursor-default rounded-none border-none shadow-none"
          : "absolute bottom-6 right-6 z-50 cursor-move rounded-2xl shadow-2xl ring-1 ring-inset",
        !isExpanded && (isDragging ? "ring-border-strong" : "ring-border"),
        !isExpanded && (isPiP ? "w-72" : "w-[400px]")
      )}
      style={
        !isExpanded
          ? {
              transform: `translate(${position.x}px, ${position.y}px) scale(${isDragging ? 1.015 : 1})`,
              transition: isDragging ? "none" : `transform 500ms cubic-bezier(0.16,1,0.3,1)`
            }
          : undefined
      }
      onMouseDown={handleMouseDown}
    >
      <div className="flex h-full flex-col bg-card">
        {hero}

        <div
          className={cn(
            "flex flex-col gap-3 bg-card p-5",
            isExpanded ? "shrink-0 border-t border-border" : "flex-1 justify-center"
          )}
        >
          {error ? (
            <PlayerErrorState error={error} onClose={closeMedia} />
          ) : (
            <PlayerControls
              title={currentMedia.title}
              channel={currentMedia.channel}
              isPlaying={isPlaying}
              isBuffering={isBuffering}
              progress={progress}
              duration={duration}
              onSeek={handleSeek}
              onTogglePlay={handleTogglePlay}
              muteButton={muteButton}
              volumeReveal={volumeReveal}
            />
          )}
        </div>
      </div>
    </div>
  );
};
