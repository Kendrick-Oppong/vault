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
import { Video, Music, Info, AudioLines, FolderOpen, Volume2 } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";
import type { FormatModalProps, MediaType, Preset } from "../types";
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
import { extractHeight, parseDurationSeconds } from "@/features/modals/lib/utils";
import { ErrorState } from "./error-state";
import { PlaylistItems } from "./playlist-items";
import { ModalHeader } from "./modal-header";
import { ModalFooter } from "./modal-footer";
import { FormatTrimSection } from "./format-trim-section";
import { Tooltip, TooltipContent, TooltipTrigger } from "@vault/ui/components/tooltip";

function formatSizeLabel(filesize: number | null): string {
  return filesize && filesize > 0 ? formatBytes(filesize) : "Size unknown";
}

export const FormatModal = ({
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
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(() => {
    const presets = mediaType === "video" ? data.videoPresets : data.audioPresets;
    if (presets.length === 0) return null;
    if (mediaType === "video") {
      return presets.find((p) => p.id === "best") || presets[0];
    }
    return presets[0];
  });
  const [formatId, setFormatId] = useState<string>("");
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
        setSelectedItems(new Set(data.playlistItems?.map((item) => item.id) || []));
        setHasMoreItems(hasMore);
      }, 0);
    }
  }, [data.id, data.type, data.playlistItems, data.totalCount]);

  const handlePlaylistPageSuccess = (newFormats: Record<string, unknown>[], limit: number) => {
    const newModalData = formatProbeToModalData(newFormats, data.url);
    const newItems = newModalData.playlistItems || [];
    const updatedPlaylistItems = [...(data.playlistItems || []), ...newItems];

    updateFormatModalData({
      ...data,
      playlistItems: updatedPlaylistItems
    });

    setSelectedItems((prev) => {
      const next = new Set(prev);
      newItems.forEach((item) => next.add(item.id));
      return next;
    });

    const shouldDisableLoadMore =
      newItems.length < limit ||
      (data.totalCount && updatedPlaylistItems.length >= data.totalCount);
    setHasMoreItems(!shouldDisableLoadMore);
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
        onSuccess: (newFormats) => handlePlaylistPageSuccess(newFormats, limit),
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
        const isValidPreset = selectedPreset && presets.some((p) => p.id === selectedPreset.id);
        if (presets.length > 0 && !isValidPreset) {
          if (mediaType === "video") {
            setSelectedPreset(presets.find((p) => p.id === "best") || presets[0]);
          } else {
            setSelectedPreset(presets[0]);
          }
        }
        if (mediaType === "audio") {
          setFormatId("");
        }
      }, 0);
    }
  }, [isLoading, data, selectedPreset, mediaType]);

  const handleOpenChange = (openState: boolean) => {
    if (isLoading) return;
    onOpenChange(openState);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAllItems = () => {
    if (!data.playlistItems) return;
    setSelectedItems((prev) =>
      prev.size === data.playlistItems!.length
        ? new Set()
        : new Set(data.playlistItems!.map((item) => item.id))
    );
  };

  // Returns 0..1 representing how much of the full duration the trim selects.
  const getTrimScale = (): number => {
    const trimActive = Boolean(trimRange.start || trimRange.end);
    if (!trimActive) return 1;

    const totalSeconds = parseDurationToSeconds(data.duration);
    if (totalSeconds <= 0) return 1;

    const startSec = parseDurationToSeconds(trimRange.start);
    const endSec = trimRange.end ? parseDurationToSeconds(trimRange.end) : totalSeconds;
    const clip = Math.max(0, endSec - startSec);
    return Math.min(1, clip / totalSeconds);
  };

  const handleConfirm = () => {
    if (!selectedPreset) return;

    const trimActive = Boolean(trimRange.start || trimRange.end);

    // Guard against an empty/invalid trim selection.
    if (trimActive) {
      const totalSeconds = parseDurationToSeconds(data.duration);
      const startSec = parseDurationToSeconds(trimRange.start);
      const endSec = trimRange.end ? parseDurationToSeconds(trimRange.end) : totalSeconds;
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
      trimRange: trimActive ? trimRange : undefined,
      frameAccurate: trimActive ? frameAccurate : undefined
    });
    onOpenChange(false);
  };

  const getSelectedVideoFormat = () => {
    if (!data.videoFormats?.length) return null;
    if (formatId) {
      return data.videoFormats.find((format) => format.formatId === formatId) ?? null;
    }
    if (selectedPreset?.maxHeight) {
      return (
        data.videoFormats
          .filter((format) => extractHeight(format.resolution) <= selectedPreset.maxHeight!)
          .sort((a, b) => extractHeight(b.resolution) - extractHeight(a.resolution))[0] ?? null
      );
    }
    return data.videoFormats[0] ?? null;
  };

  const getTotalSize = () => {
    if (data.type === "playlist") return null;

    const scale = getTrimScale();

    if (mediaType === "video") {
      const selectedFormat = getSelectedVideoFormat();
      if (!selectedFormat?.filesize) return null;
      return formatBytes(Math.round(selectedFormat.filesize * scale));
    }

    if (audioFormat === "flac" || audioFormat === "wav") return null;

    const durationSeconds = parseDurationSeconds(data.duration);
    if (!durationSeconds || !audioBitrate) return null;

    return formatBytes(Math.round((audioBitrate * 1000 * durationSeconds * scale) / 8));
  };

  const isPlaylist = data.type === "playlist";

  const getItemCount = () => {
    if (isPlaylist) {
      return selectedItems.size;
    }
    return 1;
  };

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
        {/* Cinematic hero — the centerpiece of the modal */}
        <div className="relative w-full h-68 shrink-0 bg-background overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 w-full h-full bg-muted animate-pulse" />
          ) : (
            <>
              {data.thumbnail ? (
                <>
                  <img
                    src={data.thumbnail}
                    alt={data.title}
                    className="absolute inset-0 w-full h-full object-cover scale-105 transition-transform duration-700"
                  />
                </>
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

        {/* Content */}
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
                onClick={() => setMediaType("audio")}
              >
                <Music className="w-3.5 h-3.5" />
                Audio only
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {data.videoPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    setSelectedPreset(preset);
                    setMediaType("video");
                    if (preset.maxHeight != null && data.videoFormats) {
                      const maxHeight = preset.maxHeight;
                      const match = data.videoFormats
                        .filter((f) => extractHeight(f.resolution) <= maxHeight)
                        .sort(
                          (a, b) => extractHeight(b.resolution) - extractHeight(a.resolution)
                        )[0];
                      setFormatId(match?.formatId || "");
                    } else {
                      setFormatId("");
                    }
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm uppercase transition-all duration-150",
                    selectedPreset?.id === preset.id && mediaType === "video"
                      ? "border-primary bg-primary/20 hover:bg-primary/20 text-primary"
                      : "border-border bg-secondary/60 hover:bg-primary/10"
                  )}
                >
                  {preset.label}
                </Button>
              ))}
              {data.audioPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    setSelectedPreset(preset);
                    setMediaType("audio");
                    setFormatId("");
                    if (preset.audioFormat) {
                      setAudioFormat(preset.audioFormat);
                    }
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm uppercase transition-all duration-150",
                    selectedPreset?.id === preset.id && mediaType === "audio"
                      ? "border-primary bg-primary/20 hover:bg-primary/20 text-primary"
                      : "border-border bg-secondary/60 hover:bg-primary/10"
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {mediaType === "video" && (
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                  Video format
                </p>
                <Select
                  value={formatId}
                  onValueChange={(v) => {
                    setFormatId(v || "");
                    if (v && data.videoFormats) {
                      const selectedFormat = data.videoFormats.find((f) => f.formatId === v);
                      if (selectedFormat) {
                        const height = extractHeight(selectedFormat.resolution);
                        const matchingPreset = data.videoPresets
                          .filter((p) => p.maxHeight && height <= p.maxHeight)
                          .sort((a, b) => (a.maxHeight || 0) - (b.maxHeight || 0))[0];
                        if (matchingPreset) {
                          setSelectedPreset(matchingPreset);
                        }
                      }
                    } else if (!v) {
                      const bestPreset = data.videoPresets.find((p) => p.id === "best");
                      if (bestPreset) setSelectedPreset(bestPreset);
                    }
                  }}
                >
                  <SelectTrigger className="w-full min-w-0">
                    {formatId ? (
                      <span className="min-w-0 truncate text-sm">
                        {(() => {
                          const selectedFormat = data.videoFormats?.find(
                            (f) => f.formatId === formatId
                          );
                          return selectedFormat ? (
                            <>
                              {selectedFormat.resolution}
                              {selectedFormat.fps && `@${selectedFormat.fps}`}
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
                        const matchingPreset = data.audioPresets.find(
                          (p) => p.audioFormat === format
                        );
                        if (matchingPreset) {
                          setSelectedPreset(matchingPreset);
                        }
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

            {!isPlaylist && (
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
                    onCheckedChange={(checked) => setEmbedThumbnail(!!checked)}
                    className="w-4 h-4"
                  />
                  Embed thumbnail as cover art
                </label>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <Checkbox
                    checked={embedMetadata}
                    onCheckedChange={(checked) => setEmbedMetadata(!!checked)}
                    className="w-4 h-4"
                  />
                  Embed metadata
                </label>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <Checkbox
                    checked={embedChapters}
                    onCheckedChange={(checked) => setEmbedChapters(!!checked)}
                    className="w-4 h-4"
                  />
                  Embed chapters
                </label>
                {mediaType === "video" && (
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                    <Checkbox
                      checked={sponsorBlock}
                      onCheckedChange={(checked) => setSponsorBlock(!!checked)}
                      className="w-4 h-4"
                    />
                    Remove sponsored segments
                  </label>
                )}
              </div>

              {mediaType === "video" && (
                <>
                  <div className="flex items-center gap-3 pt-2">
                    <Label className="text-[13px] text-muted-foreground w-24 shrink-0">
                      Subtitles
                    </Label>
                    <Select
                      value={subtitles}
                      onValueChange={(value) => setSubtitles(value as typeof subtitles)}
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
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Subtitles will be downloaded for all specified languages (e.g.,{" "}
                          <code>en,fr</code> = English + French)
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {mediaType === "video" && (
                <div className="flex items-center gap-3">
                  <Label className="text-[13px] text-muted-foreground w-24 shrink-0">
                    Container
                  </Label>
                  <Select
                    value={videoContainer}
                    onValueChange={(value) => setVideoContainer(value as typeof videoContainer)}
                  >
                    <SelectTrigger className="flex-1 bg-secondary/60 border-border text-[13px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4</SelectItem>
                      <SelectItem value="mkv">MKV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Label className="text-[13px] text-muted-foreground w-24 shrink-0">Save to</Label>
                <Input
                  value={destination}
                  readOnly
                  disabled
                  placeholder="~/Downloads"
                  className="flex-1 bg-secondary/60 border-border text-[12.5px] h-9"
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
