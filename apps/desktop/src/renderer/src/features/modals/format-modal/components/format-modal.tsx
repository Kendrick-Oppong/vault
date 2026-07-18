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
import type { FormatModalData, FormatModalProps, MediaType, Preset } from "../types";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { SkeletonLoader } from "@/features/ui/components/skeleton-loader";
import { useOpenFolderDialog } from "@/lib/mutations/files";
import { useProbeFormatsMutation } from "@/lib/mutations/downloads";
import { formatProbeToModalData } from "@/lib/utils/format-probe";
import { toast } from "sonner";
import type { VideoContainer, AudioFormat } from "@vault/types";
import { formatBytes } from "@/lib/utils/platform";
import { VIDEO_CONTAINERS, AUDIO_FORMATS, AUDIO_BITRATES } from "@/features/modals/lib/constants";
import { ErrorState } from "./error-state";
import { PlaylistItems } from "./playlist-items";
import { ModalHeader } from "./modal-header";
import { ModalFooter } from "./modal-footer";

const defaultData: FormatModalData = {
  id: "",
  title: "Loading...",
  channel: "",
  type: "video",
  videoPresets: [],
  audioPresets: []
};

export const FormatModal = ({
  open,
  onOpenChange,
  data = defaultData,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
  onConfirm
}: FormatModalProps) => {
  const settings = useSettingsStore(selectSettings);
  const openFolderMutation = useOpenFolderDialog();
  const { updateFormatModalData } = useModalActions();
  const probeMutation = useProbeFormatsMutation();
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(() => {
    const presets = mediaType === "video" ? data.videoPresets : data.audioPresets;
    if (presets.length === 0) return null;
    // Default to 1080p for video, or first audio preset
    if (mediaType === "video") {
      return presets.find((p) => p.id === "1080p") || presets[0];
    }
    return presets[0];
  });
  const [formatId, setFormatId] = useState<string>("");
  const [videoContainer, setVideoContainer] = useState<VideoContainer>(
    settings.videoContainer || "mp4"
  );
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");

  // Helper to extract height from resolution string
  const extractHeight = (resolution: string): number => {
    // Handle "1920x1080" format
    const xMatch = resolution.match(/(\d+)x(\d+)/);
    if (xMatch) return Number.parseInt(xMatch[2], 10);
    // Handle "1080p" format
    const pMatch = resolution.match(/(\d+)p/);
    return pMatch ? Number.parseInt(pMatch[1], 10) : 0;
  };
  const [audioBitrate, setAudioBitrate] = useState<number>(320);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const lastPlaylistId = useRef<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreItems, setHasMoreItems] = useState(false);
  const [currentLimit, setCurrentLimit] = useState<number>(settings.playlistFetchLimit);
  const [embedThumbnail, setEmbedThumbnail] = useState(settings.embedThumbnail);
  const [embedMetadata, setEmbedMetadata] = useState(settings.embedMetadata);
  const [embedChapters, setEmbedChapters] = useState(settings.embedChapters);
  const [sponsorBlock, setSponsorBlock] = useState(settings.sponsorBlock);
  const [subtitles, setSubtitles] = useState<"none" | "external">("none");
  const [subtitleLanguages, setSubtitleLanguages] = useState<string[]>(
    settings.subtitleLangs || ["en"]
  );
  const [destination, setDestination] = useState(settings.downloadPath);

  // Auto-select all playlist items when a new playlist loads
  useEffect(() => {
    if (data.type !== "playlist") {
      lastPlaylistId.current = null;
      setTimeout(() => {
        setSelectedItems(new Set());
        setHasMoreItems(false);
        setCurrentLimit(settings.playlistFetchLimit);
      }, 0);
      return;
    }
    if (lastPlaylistId.current !== data.id) {
      lastPlaylistId.current = data.id;
      const initialLimit = settings.playlistFetchLimit;
      const hasMore = !!(
        data.totalCount &&
        data.playlistItems &&
        data.playlistItems.length < data.totalCount
      );
      setTimeout(() => {
        setCurrentLimit(initialLimit);
        setSelectedItems(new Set(data.playlistItems?.map((_, i) => i + 1) || []));
        setHasMoreItems(hasMore);
      }, 0);
    }
  }, [data.id, data.type, data.playlistItems, data.totalCount, settings.playlistFetchLimit]);

  // Function to load more playlist items
  const loadMorePlaylistItems = async () => {
    if (isLoadingMore || !data.url) return;

    setIsLoadingMore(true);
    const newLimit = currentLimit + settings.playlistFetchLimit;
    setCurrentLimit(newLimit);

    probeMutation.mutate(
      { url: data.url, playlistLimit: newLimit },
      {
        onSuccess: (newFormats) => {
          const newModalData = formatProbeToModalData(newFormats, data.url);
          updateFormatModalData(newModalData);
          setSelectedItems(new Set(newModalData.playlistItems?.map((_, i) => i + 1) || []));
          if (
            newModalData.playlistItems &&
            newModalData.totalCount &&
            newModalData.playlistItems.length < newModalData.totalCount
          ) {
            setHasMoreItems(true);
          } else {
            setHasMoreItems(false);
          }
          setIsLoadingMore(false);
        },
        onError: () => {
          toast.error("Could not load more items");
          setIsLoadingMore(false);
        }
      }
    );
  };

  // Sync state when data changes (e.g. after loading finishes)
  useEffect(() => {
    if (!isLoading) {
      // Use timeout to prevent synchronous state updates during render phase
      setTimeout(() => {
        const presets = mediaType === "video" ? data.videoPresets : data.audioPresets;
        // Validate or set preset
        const isValidPreset = selectedPreset && presets.some((p) => p.id === selectedPreset.id);
        if (presets.length > 0 && !isValidPreset) {
          if (mediaType === "video") {
            setSelectedPreset(presets.find((p) => p.id === "1080p") || presets[0]);
          } else {
            setSelectedPreset(presets[0]);
          }
        }
        // Reset format ID when switching media type
        if (mediaType === "audio") {
          setFormatId("");
        }
      }, 0);
    }
  }, [isLoading, data, selectedPreset, mediaType]);

  const handleOpenChange = (openState: boolean) => {
    if (isLoading) return; // Prevent dismissing while loading
    onOpenChange(openState);
  };

  const toggleItem = (index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAllItems = () => {
    if (!data.playlistItems) return;
    setSelectedItems((prev) =>
      prev.size === data.playlistItems!.length
        ? new Set()
        : new Set(data.playlistItems!.map((_, i) => i + 1))
    );
  };

  const handleConfirm = () => {
    if (!selectedPreset) return;
    onConfirm({
      mediaType,
      preset: selectedPreset,
      formatId: formatId || undefined,
      videoContainer,
      audioFormat,
      audioBitrate:
        mediaType === "audio" && audioFormat !== "flac" && audioFormat !== "wav"
          ? audioBitrate
          : undefined,
      embedThumbnail,
      embedMetadata,
      embedChapters,
      sponsorBlock,
      subtitles,
      subtitleLanguages: subtitles !== "none" ? subtitleLanguages : undefined,
      destination,
      selectedItems: data.type === "playlist" ? [...selectedItems].map(String) : undefined
    });
    onOpenChange(false);
  };

  const getTotalSize = () => {
    // Presets don't have size info since they depend on the actual video
    return null;
  };

  const isPlaylist = data.type === "playlist";

  const getItemCount = () => {
    if (isPlaylist) {
      return selectedItems.size;
    }
    return 1;
  };

  // Error State Render
  if (isError) {
    return (
      <ErrorState open={open} onOpenChange={handleOpenChange} error={error} onRetry={onRetry} />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isLoading}
        className="max-w-2xl! max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border"
      >
        {/* Full Width Cinematic Header */}
        <div className="relative w-full h-45 shrink-0 bg-background overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 w-full h-full bg-secondary animate-pulse" />
          ) : (
            <>
              {data.thumbnail ? (
                <img
                  src={data.thumbnail}
                  alt={data.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                  style={{
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)",
                    WebkitMaskImage:
                      "linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)"
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  {mediaType === "audio" ? (
                    <AudioLines className="w-6 h-6 text-foreground/40" />
                  ) : (
                    <Video className="w-6 h-6 text-foreground/40" />
                  )}
                </div>
              )}
              {/* Gradient overlay for smooth blending with background */}
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
            </>
          )}

          {/* Title & Info overlaid at the bottom of the banner */}
          <ModalHeader data={data} isLoading={isLoading} />
        </div>

        {/* Content */}
        {isLoading ? (
          <SkeletonLoader type="format-modal" />
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Playlist Items */}
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

            {/* Media Type Toggle */}
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

            {/* Preset Badges */}
            <div className="flex flex-wrap gap-1.5">
              {data.videoPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    setSelectedPreset(preset);
                    setMediaType("video");
                    // Auto-select format based on preset height
                    if (preset.maxHeight != null && data.videoFormats) {
                      const maxHeight = preset.maxHeight;
                      const match = data.videoFormats.find(
                        (f) => extractHeight(f.resolution) <= maxHeight
                      );
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
                    // Auto-select audio format based on preset
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

            {/* Format Selection */}
            {mediaType === "video" && (
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                  Video format
                </p>
                <Select
                  value={formatId}
                  onValueChange={(v) => {
                    setFormatId(v || "");
                    // Auto-select preset based on selected format
                    if (v && data.videoFormats) {
                      const selectedFormat = data.videoFormats.find((f) => f.formatId === v);
                      if (selectedFormat) {
                        const height = extractHeight(selectedFormat.resolution);
                        const matchingPreset = data.videoPresets.find(
                          (p) => p.maxHeight && height <= p.maxHeight
                        );
                        if (matchingPreset) {
                          setSelectedPreset(matchingPreset);
                        }
                      }
                    } else if (!v) {
                      // Reset to "Best" preset when auto is selected
                      const bestPreset = data.videoPresets.find((p) => p.id === "best");
                      if (bestPreset) setSelectedPreset(bestPreset);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    {formatId ? (
                      <span className="text-sm">
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
                  <SelectContent>
                    <SelectItem value="">Best quality (auto)</SelectItem>
                    {data.videoFormats?.map((f) => (
                      <SelectItem key={f.formatId} value={f.formatId}>
                        <span className="flex flex-col">
                          <span>
                            {f.resolution}
                            {f.fps && `@${f.fps}`}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {f.ext} · {formatBytes(f.filesize || 0)} · + audio
                          </span>
                        </span>
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

            {/* Container Selection (Video) */}
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

            {/* Audio Format Selection */}
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
                        // Auto-select preset based on audio format
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

            {/* Post-processing */}
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
                {/* SponsorBlock is video-only */}
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

              {/* Subtitles - video only */}
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

                  {/* Subtitle language picker — shown when subtitles are enabled */}
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

              {/* Container option - only for video */}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 shrink-0"
                  onClick={() =>
                    openFolderMutation.mutate(undefined, {
                      onSuccess: (folder) => {
                        if (folder) setDestination(folder);
                      }
                    })
                  }
                  title="Browse folders"
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Duplicate Warning */}
            {!isLoading && data.duplicate && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-[12.5px] text-primary">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>This is already in your library. Adding it again saves a second copy.</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
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
