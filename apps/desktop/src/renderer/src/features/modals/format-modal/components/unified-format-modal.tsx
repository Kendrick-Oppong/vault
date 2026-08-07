import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@vault/ui/components/dialog";
import { Button } from "@vault/ui/components/button";
import { Input } from "@vault/ui/components/input";
import { Checkbox } from "@vault/ui/components/checkbox";
import { Label } from "@vault/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@vault/ui/components/select";
import { Video, Music, Info, AudioLines, FolderOpen, Volume2, AlertTriangle } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";
import type { FormatModalProps, MediaType, Preset } from "../types";
import { deriveCapabilities } from "../lib/source-capabilities";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings, useSettingsActions } from "@/stores/settings/settings.selectors";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { SkeletonLoader } from "@/features/ui/components/skeleton-loader";
import { useOpenFolderDialog } from "@/lib/mutations/files";
import { useProbePlaylistPageMutation } from "@/lib/mutations/downloads";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import { toast } from "sonner";
import type { VideoContainer, AudioFormat } from "@vault/types";
import { formatBytes } from "@/lib/utils/platform";
import { parseDurationToSeconds } from "@/lib/utils/format";
import { VIDEO_CONTAINERS, AUDIO_FORMATS, AUDIO_BITRATES } from "@/features/modals/lib/constants";
import { extractHeight } from "@/features/modals/lib/utils";
import { ErrorState } from "./error-state";
import { PlaylistItems } from "./playlist-items";
import { ModalHeader } from "./modal-header";
import { ModalFooter } from "./modal-footer";
import { FormatTrimSection } from "./format-trim-section";
import { Tooltip, TooltipContent, TooltipTrigger } from "@vault/ui/components/tooltip";

function formatSizeLabel(filesize: number | null): string {
  return filesize && filesize > 0 ? formatBytes(filesize) : "Size unknown";
}

export const UnifiedFormatModal = ({
  open,
  onOpenChange,
  data,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
  onConfirm
}: FormatModalProps) => {
  const settings = useSettingsStore(selectSettings);
  const { updateSetting } = useSettingsActions();
  const openFolderMutation = useOpenFolderDialog();
  const { updateFormatModalData } = useModalActions();
  const playlistPageMutation = useProbePlaylistPageMutation();

  // Capability-driven: derive everything from the normalized source.
  const caps = deriveCapabilities(
    data.source ?? {
      url: data.url ?? "",
      platform: data.platform ?? "generic",
      extractorKey: "",
      title: data.title,
      channel: data.channel,
      thumbnail: data.thumbnail,
      durationSeconds: parseDurationToSeconds(data.duration) || null,
      isLive: false,
      isPlaylist: data.type === "playlist",
      playlistItems: data.playlistItems,
      totalCount: data.totalCount,
      videoFormats: [],
      audioFormats: [],
      otherFormats: [],
      formatCount: data.videoFormats?.length ?? 0,
      subtitleCount: 0,
      hasChapters: false
    }
  );

  const [mediaType, setMediaType] = useState<MediaType>(caps.isAudioOnlySource ? "audio" : "video");
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(() => {
    const presets = mediaType === "video" ? data.videoPresets : data.audioPresets;
    if (presets.length === 0) return null;
    return mediaType === "video" ? presets.find((p) => p.id === "best") || presets[0] : presets[0];
  });
  const [formatId, setFormatId] = useState("");
  const [videoContainer, setVideoContainer] = useState<VideoContainer>(
    settings.videoContainer || "mp4"
  );
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [audioBitrate, setAudioBitrate] = useState<number>(320);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const lastPlaylistId = useRef<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreItems, setHasMoreItems] = useState(false);
  const [embedThumbnail, setEmbedThumbnail] = useState(settings.embedThumbnail);
  const [embedMetadata, setEmbedMetadata] = useState(settings.embedMetadata);
  const [embedChapters, setEmbedChapters] = useState(settings.embedChapters);
  const [sponsorBlock, setSponsorBlock] = useState(settings.sponsorBlock);
  const [subtitles, setSubtitles] = useState<"none" | "external">("none");
  const [subtitleLanguages, setSubtitleLanguages] = useState<string[]>(
    settings.subtitleLangs || ["en"]
  );
  const [destination, setDestination] = useState(settings.downloadPath);
  const [trimRange, setTrimRange] = useState<{ start?: string; end?: string }>({});
  const [frameAccurate, setFrameAccurate] = useState(false);
  const [pathWarning, setPathWarning] = useState<string | null>(null);

  // Validate destination path whenever it changes
  useEffect(() => {
    let cancelled = false;

    if (!destination) {
      Promise.resolve().then(() => {
        if (!cancelled) setPathWarning(null);
      });
    } else {
      globalThis.api.directoryExists(destination).then((result) => {
        if (cancelled) return;
        if (!result.exists) {
          setPathWarning(
            "This output folder does not exist. Reconnect the drive or choose another path."
          );
        } else if (!result.writable) {
          setPathWarning("This folder is read-only.");
        } else {
          setPathWarning(null);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [destination]);

  useEffect(() => {
    if (data.type !== "playlist") {
      lastPlaylistId.current = null;
      setTimeout(() => {
        setSelectedItems(new Set());
        setHasMoreItems(false);
      }, 0);
      return;
    }
    if (lastPlaylistId.current !== data.id) {
      lastPlaylistId.current = data.id;
      const hasMore = !!(
        data.totalCount &&
        data.playlistItems &&
        data.playlistItems.length < data.totalCount
      );
      setTimeout(() => {
        setSelectedItems(
          new Set(data.playlistItems?.filter((i) => !i.unavailable).map((i) => i.id) || [])
        );
        setHasMoreItems(hasMore);
      }, 0);
    }
  }, [data.id, data.type, data.playlistItems, data.totalCount]);

  const handlePlaylistPageSuccess = (newFormats: Record<string, unknown>[], limit: number) => {
    const newModalData = formatProbeToModalData(newFormats, data.url);
    const newItems = newModalData.playlistItems || [];
    updateFormatModalData({ ...data, playlistItems: [...(data.playlistItems || []), ...newItems] });
    setSelectedItems((prev) => {
      const next = new Set(prev);
      newItems.forEach((i) => {
        if (!i.unavailable) next.add(i.id);
      });
      return next;
    });
    const shouldDisable =
      newItems.length < limit ||
      (data.totalCount && (data.playlistItems?.length ?? 0) + newItems.length >= data.totalCount);
    setHasMoreItems(!shouldDisable);
    setIsLoadingMore(false);
  };

  const loadMorePlaylistItems = async () => {
    if (isLoadingMore || !data.url || !data.playlistItems) return;
    setIsLoadingMore(true);
    const start = data.playlistItems.length + 1;
    const limit = settings.playlistFetchLimit;
    const end = data.totalCount ? Math.min(data.totalCount, start + limit - 1) : start + limit - 1;
    playlistPageMutation.mutate(
      { url: data.url, start, end },
      {
        onSuccess: (f) => handlePlaylistPageSuccess(f, limit),
        onError: () => {
          toast.error("Could not load more items");
          setIsLoadingMore(false);
        }
      }
    );
  };

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        const presets = mediaType === "video" ? data?.videoPresets : data?.audioPresets;
        const isValid = selectedPreset && presets.some((p) => p.id === selectedPreset.id);
        if (presets.length > 0 && !isValid) {
          setSelectedPreset(
            mediaType === "video" ? presets.find((p) => p.id === "best") || presets[0] : presets[0]
          );
        }
        if (mediaType === "audio") setFormatId("");
      }, 0);
    }
  }, [isLoading, data, selectedPreset, mediaType]);

  const handleOpenChange = (openState: boolean) => {
    if (isLoading) return;
    onOpenChange(openState);
  };

  const toggleItem = (itemId: string) => {
    if (data.playlistItems?.find((i) => i.id === itemId)?.unavailable) return;
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAllItems = () => {
    if (!data.playlistItems) return;
    const available = data.playlistItems.filter((i) => !i.unavailable);
    setSelectedItems((prev) =>
      prev.size === available.length ? new Set() : new Set(available.map((i) => i.id))
    );
  };

  const handleConfirm = () => {
    if (!selectedPreset) return;

    // Block confirm if path is invalid
    if (pathWarning) {
      toast.error("Cannot download", { description: pathWarning });
      return;
    }

    const trimActive = Boolean(trimRange.start || trimRange.end);
    if (trimActive && caps.canTrim) {
      const total = parseDurationToSeconds(data.duration);
      const startSec = parseDurationToSeconds(trimRange.start);
      const endSec = trimRange.end ? parseDurationToSeconds(trimRange.end) : total;
      if (endSec - startSec <= 0) {
        toast.error("Trim range is empty", {
          description: "Move the handles so the selected clip is longer than 0 seconds."
        });
        return;
      }
    }
    const actualAudioFormat =
      mediaType === "audio" ? selectedPreset.audioFormat || "mp3" : audioFormat;
    onConfirm({
      mediaType,
      preset: selectedPreset,
      formatId: formatId || undefined,
      videoContainer,
      audioFormat: actualAudioFormat,
      audioBitrate:
        mediaType === "audio" && actualAudioFormat !== "flac" && actualAudioFormat !== "wav"
          ? audioBitrate
          : undefined,
      embedThumbnail,
      embedMetadata,
      embedChapters,
      sponsorBlock,
      subtitles,
      subtitleLanguages: subtitles !== "none" ? subtitleLanguages : undefined,
      destination,
      selectedItems: data.type === "playlist" ? [...selectedItems] : undefined,
      trimRange: trimActive && caps.canTrim ? trimRange : undefined,
      frameAccurate: trimActive && caps.canTrim ? frameAccurate : undefined
    });
    onOpenChange(false);
  };

  const getSelectedVideoFormat = () => {
    if (!data.videoFormats?.length) return null;
    if (formatId) return data.videoFormats.find((f) => f.formatId === formatId) ?? null;
    if (selectedPreset?.maxHeight) {
      return (
        data.videoFormats
          .filter((f) => extractHeight(f.resolution) <= selectedPreset.maxHeight!)
          .sort((a, b) => extractHeight(b.resolution) - extractHeight(a.resolution))[0] ?? null
      );
    }
    return data.videoFormats[0] ?? null;
  };

  const getTotalSize = () => {
    if (data.type === "playlist") return null;
    if (mediaType === "video") {
      const f = getSelectedVideoFormat();
      if (!f?.filesize) return null;
      return formatBytes(f.filesize);
    }
    if (audioFormat === "flac" || audioFormat === "wav") return null;
    const durationSeconds = parseDurationToSeconds(data.duration);
    if (!durationSeconds || !audioBitrate) return null;
    return formatBytes(Math.round((audioBitrate * 1000 * durationSeconds) / 8));
  };

  const isPlaylist = data.type === "playlist";
  const getItemCount = () => (isPlaylist ? selectedItems.size : 1);

  if (isError) {
    return (
      <ErrorState open={open} onOpenChange={handleOpenChange} error={error} onRetry={onRetry} />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-180! max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border gap-0"
      >
        <div className="relative w-full h-68 shrink-0 bg-background overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 w-full h-full bg-muted animate-pulse" />
          ) : (
            <>
              {data.thumbnail ? (
                <img
                  src={data.thumbnail}
                  alt={data.title}
                  className="absolute inset-0 w-full h-full object-cover scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/40">
                  {mediaType === "audio" ? (
                    <AudioLines className="w-10 h-10 text-foreground/30" />
                  ) : (
                    <Video className="w-10 h-10 text-foreground/30" />
                  )}
                </div>
              )}
            </>
          )}
          <ModalHeader data={data} isLoading={isLoading} />
        </div>

        {isLoading ? (
          <SkeletonLoader type="format-modal" />
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isPlaylist && data.playlistItems && (
              <PlaylistItems
                items={data.playlistItems}
                selectedItems={selectedItems}
                isLoadingMore={isLoadingMore}
                hasMoreItems={hasMoreItems}
                totalCount={data.totalCount}
                onToggleItem={toggleItem}
                onToggleAll={toggleAllItems}
                onLoadMore={loadMorePlaylistItems}
              />
            )}

            {/* Media type toggle — hidden for audio-only sources */}
            {!caps.isAudioOnlySource && (
              <div className="flex items-center gap-1 bg-secondary/60 border p-1 rounded-lg w-fit">
                <Button
                  variant={mediaType === "video" ? "default" : "ghost"}
                  size="sm"
                  className="px-3.5 py-1.5 text-[12.5px] font-medium flex items-center gap-1.5 h-auto"
                  onClick={() => setMediaType("video")}
                >
                  <Video className="w-3.5 h-3.5" />
                  Video
                </Button>
                <Button
                  variant={mediaType === "audio" ? "default" : "ghost"}
                  size="sm"
                  className="px-3.5 py-1.5 text-[12.5px] font-medium flex items-center gap-1.5 h-auto"
                  onClick={() => {
                    setMediaType("audio");
                    setFormatId("");
                  }}
                >
                  <Music className="w-3.5 h-3.5" />
                  Audio only
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {(mediaType === "video" ? data.videoPresets : data.audioPresets).map((preset) => (
                <Button
                  key={preset.id}
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    setSelectedPreset(preset);
                    if (preset.mediaType === "audio") {
                      setMediaType("audio");
                      setFormatId("");
                      if (preset.audioFormat) setAudioFormat(preset.audioFormat);
                    } else {
                      setMediaType("video");
                      if (preset.maxHeight != null && data.videoFormats) {
                        const match = data.videoFormats
                          .filter((f) => extractHeight(f.resolution) <= preset.maxHeight!)
                          .sort(
                            (a, b) => extractHeight(b.resolution) - extractHeight(a.resolution)
                          )[0];
                        setFormatId(match?.formatId || "");
                      } else setFormatId("");
                    }
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm uppercase transition-all duration-150",
                    selectedPreset?.id === preset.id && mediaType === preset.mediaType
                      ? "border-primary bg-primary/20 hover:bg-primary/20 text-primary"
                      : "border-border bg-secondary/60 hover:bg-primary/10"
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {mediaType === "video" && caps.canSelectVideoQuality && (
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                  Video format
                </p>
                <Select
                  value={formatId}
                  onValueChange={(v) => {
                    setFormatId(v || "");
                    if (v && data.videoFormats) {
                      const f = data.videoFormats.find((f) => f.formatId === v);
                      if (f) {
                        const height = extractHeight(f.resolution);
                        const match = data.videoPresets
                          .filter((p) => p.maxHeight && height <= p.maxHeight)
                          .sort((a, b) => (a.maxHeight || 0) - (b.maxHeight || 0))[0];
                        if (match) setSelectedPreset(match);
                      }
                    } else if (!v) {
                      const best = data.videoPresets.find((p) => p.id === "best");
                      if (best) setSelectedPreset(best);
                    }
                  }}
                >
                  <SelectTrigger className="w-full min-w-0">
                    {formatId ? (
                      <span className="min-w-0 truncate text-sm">
                        {(() => {
                          const f = data.videoFormats?.find((f) => f.formatId === formatId);
                          return f ? (
                            <>
                              {f.resolution}
                              {f.fps && `@${f.fps}`}
                            </>
                          ) : null;
                        })()}
                      </span>
                    ) : (
                      <SelectValue placeholder="Best quality (auto)" />
                    )}
                  </SelectTrigger>
                  <SelectContent className="w-(--anchor-width) max-w-[calc(100vw-2rem)]">
                    <SelectItem value="">Best quality (auto)</SelectItem>
                    {data.videoFormats?.map((f) => (
                      <SelectItem key={f.formatId} value={f.formatId}>
                        <div className="flex min-w-0 flex-1 items-baseline gap-2">
                          <p className="shrink-0">
                            {f.resolution}
                            {f.fps && `@${f.fps}`}
                          </p>
                          <p className="min-w-0 truncate text-xs text-muted-foreground">
                            {f.ext} · {formatSizeLabel(f.filesize)} · + audio
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Volume2 className="w-3 h-3 text-primary" />
                  Best available audio is automatically merged into the video.
                </p>
              </div>
            )}

            {mediaType === "video" && (
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                  Container
                </p>
                <div className="flex items-center gap-2">
                  {VIDEO_CONTAINERS.map((container) => (
                    <Button
                      key={container}
                      variant="secondary"
                      size="xs"
                      onClick={() => setVideoContainer(container as VideoContainer)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm uppercase transition-all duration-150",
                        videoContainer === container
                          ? "border-primary bg-primary/20 hover:bg-primary/20 text-primary"
                          : "border-border bg-secondary/60 hover:bg-primary/10"
                      )}
                    >
                      {container}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {mediaType === "audio" && (
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                  Audio format
                </p>
                <div className="flex flex-wrap gap-2">
                  {AUDIO_FORMATS.map((format) => (
                    <Button
                      key={format}
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        setAudioFormat(format);
                        const match = data.audioPresets.find((p) => p.audioFormat === format);
                        if (match) setSelectedPreset(match);
                      }}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm uppercase transition-all duration-150",
                        audioFormat === format
                          ? "border-primary bg-primary/20 hover:bg-primary/20 text-primary"
                          : "border-border bg-secondary/60 hover:bg-primary/10"
                      )}
                    >
                      {format}
                    </Button>
                  ))}
                </div>
                {audioFormat !== "flac" && audioFormat !== "wav" && (
                  <div className="space-y-2 mt-5">
                    <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                      Bitrate
                    </p>
                    <Select
                      value={String(audioBitrate)}
                      onValueChange={(v) => setAudioBitrate(Number(v))}
                    >
                      <SelectTrigger className="w-36">
                        {audioBitrate ? (
                          <span className="text-sm">{audioBitrate} kbps</span>
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIO_BITRATES.map((b) => (
                          <SelectItem key={b} value={String(b)}>
                            {b} kbps
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Trim — only when the source has a known duration and isn't a playlist */}
            {!isPlaylist && caps.canTrim && (
              <FormatTrimSection
                duration={data.duration}
                trimRange={trimRange}
                onTrimRangeChange={setTrimRange}
                frameAccurate={frameAccurate}
                onFrameAccurateChange={setFrameAccurate}
              />
            )}

            <div className="space-y-3 pt-2">
              <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                Post-processing
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <Checkbox
                    checked={embedThumbnail}
                    onCheckedChange={(c) => setEmbedThumbnail(!!c)}
                    className="w-4 h-4"
                  />
                  Embed thumbnail as cover art
                </label>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <Checkbox
                    checked={embedMetadata}
                    onCheckedChange={(c) => setEmbedMetadata(!!c)}
                    className="w-4 h-4"
                  />
                  Embed metadata
                </label>
                {caps.hasChapters && (
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                    <Checkbox
                      checked={embedChapters}
                      onCheckedChange={(c) => setEmbedChapters(!!c)}
                      className="w-4 h-4"
                    />
                    Embed chapters
                  </label>
                )}
                {caps.supportsSponsorBlock && mediaType === "video" && (
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                    <Checkbox
                      checked={sponsorBlock}
                      onCheckedChange={(c) => setSponsorBlock(!!c)}
                      className="w-4 h-4"
                    />
                    Remove sponsored segments
                  </label>
                )}
              </div>

              {caps.hasSubtitles && mediaType === "video" && (
                <>
                  <div className="flex items-center gap-3 pt-2">
                    <Label className="text-[13px] text-muted-foreground w-24 shrink-0">
                      Subtitles
                    </Label>
                    <Select
                      value={subtitles}
                      onValueChange={(v) => setSubtitles(v as typeof subtitles)}
                    >
                      <SelectTrigger className="flex-1 bg-secondary/60 border-border text-[13px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="external">Save as .srt file</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {subtitles !== "none" && (
                    <div className="flex items-center gap-3">
                      <Label className="text-[13px] text-muted-foreground w-24 shrink-0">
                        Languages
                      </Label>
                      <div className="flex-1">
                        <Input
                          value={subtitleLanguages.join(",")}
                          onChange={(e) =>
                            setSubtitleLanguages(
                              e.target.value
                                .split(",")
                                .map((l) => l.trim())
                                .filter(Boolean)
                            )
                          }
                          className="h-9 bg-secondary/60 border-border text-[12.5px]"
                          placeholder="en, zh, fr (comma-separated)"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <Label className="text-[13px] text-muted-foreground w-24 shrink-0">Save to</Label>
                  <Input
                    value={destination}
                    readOnly
                    disabled
                    placeholder="~/Downloads"
                    className={cn(
                      "flex-1 bg-secondary/60 text-[12.5px] h-9",
                      pathWarning ? "border border-destructive!" : "border-border"
                    )}
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 shrink-0"
                          onClick={() =>
                            openFolderMutation.mutate(undefined, {
                              onSuccess: (folder) => {
                                if (folder) {
                                  setDestination(folder);
                                  updateSetting("downloadPath", folder);
                                }
                              }
                            })
                          }
                        >
                          <FolderOpen className="w-4 h-4" />
                        </Button>
                      }
                    />
                    <TooltipContent side="top" sideOffset={8}>
                      Browse folders
                    </TooltipContent>
                  </Tooltip>
                </div>
                {pathWarning && (
                  <div className="flex items-start gap-2 text-[12px] text-destructive ml-26">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{pathWarning}</span>
                  </div>
                )}
              </div>
            </div>

            {!isLoading && data.duplicate && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-[12.5px] text-primary">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>This is already in your library. Adding it again saves a second copy.</span>
              </div>
            )}
          </div>
        )}

        {!isLoading && (
          <ModalFooter
            isLoading={isLoading}
            isPlaylist={isPlaylist}
            selectedItemsCount={selectedItems.size}
            getTotalSize={getTotalSize}
            getItemCount={getItemCount}
            onCancel={() => onOpenChange(false)}
            onConfirm={handleConfirm}
            selectedPreset={selectedPreset}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
