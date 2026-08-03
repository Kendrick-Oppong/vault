import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Play, Volume2, VolumeX, Music } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { usePlayerStore } from "@/stores/player/player.store";
import { usePlayerState, usePlayerActions } from "@/stores/player/player.selectors";
import { cn } from "@vault/ui/lib/utils";
import { PlayerSlider } from "./player-slider";
import { EqualizerBars } from "./equalizer-bars";
import { PlayerWindowButtons } from "./player-window-buttons";
import { PlayerErrorState } from "./player-error-state";
import { PlayerControls } from "./player-controls";
import { useAutoHidePlayerControls } from "../hooks/use-auto-hide-player-controls";
import { useDraggablePlayer } from "../hooks/use-draggable-player";

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export const GlobalPlayer = () => {
  const { currentMedia, isPlaying, isPiP, volume, isMuted, isExpanded, isLooping } =
    usePlayerState();
  const { setIsPlaying, closeMedia, toggleExpanded, setVolume, toggleMute, toggleLoop } =
    usePlayerActions();

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Auto-hide Controls Logic ───────────────────────────────────────────
  const { showControls, notifyPointerActivity: handleMouseMove } = useAutoHidePlayerControls();

  // ── Floating-window drag ───────────────────────────────────────────────
  const { position, isDragging, suppressClickRef, handleMouseDown } = useDraggablePlayer(
    playerRef,
    isExpanded,
    isPiP
  );

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

  useEffect(() => {
    if (!currentMedia?.filePath) return;

    let cancelled = false;

    globalThis.api
      .getMediaUrl(currentMedia.filePath)
      .then((result) => {
        if (cancelled) return;

        if (!result.exists || !result.url) {
          setError(
            "File not found — it may have been moved or deleted from your downloads folder."
          );
          return;
        }

        setMediaSrc(result.url);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load media");
      });

    return () => {
      cancelled = true;
    };
  }, [currentMedia?.filePath]);

  const isAudio = currentMedia?.type === "music";

  useEffect(() => {
    const el = mediaRef.current;
    if (el) {
      el.volume = volume;
      el.muted = isMuted;
    }
  }, [volume, isMuted, mediaSrc, isAudio]);

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
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
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

  const handleEnded = () => {
    if (usePlayerStore.getState().isLooping) {
      const el = mediaRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => setIsPlaying(false));
      }
    } else {
      setIsPlaying(false);
    }
  };

  const handleSeek = (value: number | readonly number[]) => {
    const time = Array.isArray(value) ? value[0] : (value as number);

    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setProgress(time);
    }
  };

  if (!currentMedia || !currentMedia.filePath) return null;

  const thumb = currentMedia.thumbnail;

  const volumeReveal = (
    <div
      className={cn(
        `h-4 items-center opacity-0 transition-all duration-300 ${EASE}`,
        "pointer-events-none w-0 group-hover/vol:pointer-events-auto group-hover/vol:w-24 group-hover/vol:opacity-100",
        "group-focus-within/vol:pointer-events-auto group-focus-within/vol:w-24 group-focus-within/vol:opacity-100 ",
        "left-full ml-2"
      )}
    >
      <PlayerSlider
        className={`w-full ${isExpanded && "bg-background/20! dark:bg-foreground/20!"}`}
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
      className={`h-8 w-8 rounded-full text-muted-foreground transition-all duration-300 ${EASE} hover:scale-110 hover:text-foreground active:scale-95 ${
        isExpanded &&
        "text-background! dark:text-foreground! hover:bg-foreground/20! dark:hover:bg-foreground/20!"
      }`}
      onClick={toggleMute}
    >
      {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );

  // ── Visibility Classes ─────────────────────────────────────────────────
  const controlsVisibility = cn(
    "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
    showControls || !isExpanded || !isPlaying
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-4 pointer-events-none"
  );

  const buttonsVisibility = cn(
    "transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
    showControls || !isExpanded || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
  );

  /* ── Unified Hero Media Area ─────────────────────────────────────────── */
  const hero = (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        isExpanded
          ? "absolute inset-0"
          : isAudio
            ? "aspect-square max-h-[300px] shrink-0"
            : "aspect-video shrink-0"
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

      {/* Framed media area */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          isAudio ? (isExpanded ? "p-10" : "p-6") : isExpanded ? "p-0" : "p-6"
        )}
      >
        {mediaSrc && !isAudio ? (
          // VIDEO ELEMENT
          <video
            ref={mediaRef as unknown as RefObject<HTMLVideoElement>}
            src={mediaSrc}
            className={cn(
              "w-full transition-transform duration-700",
              EASE,
              isExpanded
                ? "h-full w-full object-contain rounded-none shadow-none ring-0"
                : "aspect-video max-h-[300px] rounded-3xl shadow-2xl ring-1 ring-inset ring-border-strong object-contain",
              isPlaying && !isExpanded && "scale-[1.02]"
            )}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleCanPlay}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onEnded={handleEnded}
            onError={(e) => {
              const err = (e.target as HTMLVideoElement).error;
              setError(`Failed to load video (code ${err?.code})`);
            }}
            onClick={handleTogglePlay}
          >
            <track kind="captions" />
          </video>
        ) : thumb ? (
          // AUDIO IMAGE
          <div
            className={cn(
              `group/art relative aspect-square w-full overflow-hidden rounded-3xl shadow-2xl transition-transform duration-700`,
              EASE,
              isExpanded ? "max-w-[420px] -translate-y-10" : "max-w-[240px]",
              isPlaying && "scale-[1.02]"
            )}
          >
            <img src={thumb} alt={currentMedia.title} className="h-full w-full object-cover" />
          </div>
        ) : (
          // AUDIO FALLBACK
          <div
            className={cn(
              "relative flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-muted/40 shadow-inner backdrop-blur-xl",
              isExpanded ? "max-w-[420px]" : "max-w-[240px]"
            )}
          >
            <Music className="h-10 w-10 text-muted-foreground/40" />
            {isPlaying && <EqualizerBars active size="lg" />}
          </div>
        )}
      </div>

      {/* Overlays for Video: Play */}
      {!isAudio && !error && !isPlaying && !isBuffering && mediaSrc && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border-strong bg-background/15 shadow-2xl backdrop-blur-md">
            <Play className="ml-1 h-7 w-7 fill-background text-background dark:fill-foreground dark:text-foreground" />
          </div>
        </div>
      )}

      {/* Overlays for Video: Buffering */}
      {!isAudio && !error && isBuffering && mediaSrc && (
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
        className={cn("z-30", buttonsVisibility)}
      />

      {/* AUDIO ELEMENT */}
      {isAudio && mediaSrc && (
        <audio
          ref={mediaRef as unknown as RefObject<HTMLAudioElement>}
          src={mediaSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onEnded={handleEnded}
          onError={(e) => {
            const err = (e.target as HTMLAudioElement).error;
            setError(`Failed to load audio (code ${err?.code})`);
          }}
        >
          <track kind="captions" />
        </audio>
      )}
    </div>
  );

  return (
    <div
      ref={playerRef}
      className={cn(
        `flex select-none flex-col overflow-hidden border border-border bg-card transition-shadow duration-500 ${EASE}`,
        isExpanded
          ? cn(
              "fixed inset-0 z-50 h-screen w-screen rounded-none border-none shadow-none bg-background",
              !showControls && isPlaying ? "cursor-none" : "cursor-default"
            )
          : "absolute bottom-6 right-6 z-50 cursor-move rounded-2xl shadow-2xl ring-1 ring-inset",
        !isExpanded && (isDragging ? "ring-border-strong" : "ring-border"),
        !isExpanded && (isPiP ? "w-72" : "w-[400px]")
      )}
      style={
        !isExpanded
          ? {
              transform: `translate(${position.x}px, ${position.y}px) scale(${
                isDragging ? 1.015 : 1
              })`,
              transition: isDragging ? "none" : `transform 500ms cubic-bezier(0.16,1,0.3,1)`
            }
          : undefined
      }
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onPointerDown={handleMouseMove}
    >
      <div className="relative flex h-full flex-col bg-card">
        {hero}

        <div
          className={cn(
            "flex flex-col gap-3 p-4",
            isExpanded
              ? cn(
                  "absolute inset-x-0 bottom-0 z-20 bg-foreground/40 backdrop-blur-md dark:bg-background/40 p-4",
                  "[&_button]:text-foreground/80 [&_button:hover]:text-foreground [&_svg]:text-current",
                  controlsVisibility
                )
              : "flex-1 justify-center bg-card"
          )}
        >
          {error ? (
            <PlayerErrorState error={error} onClose={closeMedia} isExpanded={isExpanded} />
          ) : (
            <PlayerControls
              isExpanded={isExpanded}
              title={currentMedia.title}
              channel={currentMedia.channel}
              isPlaying={isPlaying}
              isBuffering={isBuffering}
              isLooping={isLooping}
              progress={progress}
              duration={duration}
              onSeek={handleSeek}
              onTogglePlay={handleTogglePlay}
              onToggleLoop={toggleLoop}
              muteButton={muteButton}
              volumeReveal={volumeReveal}
            />
          )}
        </div>
      </div>
    </div>
  );
};
