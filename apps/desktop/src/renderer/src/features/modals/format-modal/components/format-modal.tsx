import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@vault/ui/components/dialog";
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
import { Badge } from "@vault/ui/components/badge";
import {
  Video,
  Music,
  ListOrdered,
  Download,
  Info,
  AlertCircle,
  RefreshCw,
  AudioLines,
  FolderOpen,
  Volume2
} from "lucide-react";
import { cn } from "@vault/ui/lib/utils";
import type { FormatModalData, FormatModalProps, MediaType, Preset } from "../types";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { SkeletonLoader } from "@/features/ui/components/skeleton-loader";
import { useOpenFolderDialog } from "@/lib/mutations/files";
import type { VideoContainer, AudioFormat } from "@vault/types";
import { formatBytes } from "@/lib/utils/platform";
import { VIDEO_CONTAINERS, AUDIO_FORMATS, AUDIO_BITRATES } from "@/features/modals/lib/constants";

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
      }, 0);
      return;
    }
    if (lastPlaylistId.current !== data.id) {
      lastPlaylistId.current = data.id;
      setTimeout(() => {
        setSelectedItems(new Set(data.playlistItems?.map((_, i) => i + 1) || []));
      }, 0);
    }
  }, [data.id, data.type, data.playlistItems]);

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
      reencodeFormat: undefined,
      destination,
      selectedItems: data.type === "playlist" ? [...selectedItems].map(String) : undefined
    });
    onOpenChange(false);
  };

  const getTotalSize = () => {
    // Presets don't have size info since they depend on the actual video
    return null;
  };

  const getBadges = () => {
    if (data.type === "playlist") {
      return [{ label: "Playlist" }, { label: `${data.videoCount} videos` }];
    }
    return [{ label: data.duration || "Video" }];
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
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md flex flex-col p-8 overflow-hidden rounded-2xl border-border">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-lg font-medium">Failed to load info</DialogTitle>
              <p className="text-[13px] text-muted-foreground mt-1.5">
                {error || "An unknown error occurred."}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {onRetry && (
                <Button onClick={onRetry} className="bg-primary text-primary-foreground">
                  <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const thumbnailFallback =
    mediaType === "audio" ? (
      <AudioLines className="w-6 h-6 text-foreground/40" />
    ) : (
      <Video className="w-6 h-6 text-foreground/40" />
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isLoading}
        className="max-w-2xl! max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border"
      >
        {/* Full Width Cinematic Header */}
        <div className="relative w-full h-[180px] shrink-0 bg-black overflow-hidden">
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
                  {thumbnailFallback}
                </div>
              )}
              {/* Gradient overlay for smooth blending with background */}
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
            </>
          )}

          {/* Title & Info overlaid at the bottom of the banner */}
          <DialogHeader className="absolute bottom-0 left-0 right-0 p-5 pt-12 flex flex-col justify-end text-left z-10 space-y-0">
            {isLoading ? (
              <SkeletonLoader type="format-modal-header" />
            ) : (
              <>
                <DialogTitle className="font-semibold text-xl truncate leading-tight drop-shadow-md text-foreground">
                  {data.title}
                </DialogTitle>
                <p className="text-[13px] text-foreground mt-1 drop-shadow-sm font-medium">
                  {data.channel}
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  {getBadges().map((badge, i) => (
                    <Badge
                      key={`badge-${i.toString()}`}
                      className="text-base px-2 text-primary! py-0.5 border-none shadow-sm backdrop-blur-md bg-background/80"
                    >
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </DialogHeader>
        </div>

        {/* Content */}
        {isLoading ? (
          <SkeletonLoader type="format-modal" />
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Playlist Items */}
            {isPlaylist && data.playlistItems && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5" />
                    Playlist items
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    <span className="font-medium">{selectedItems.size}</span> of{" "}
                    <span>{data.playlistItems.length}</span> selected
                  </p>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-[12px] text-primary h-auto p-0"
                    onClick={toggleAllItems}
                  >
                    {selectedItems.size === data.playlistItems.length
                      ? "Deselect all"
                      : "Select all"}
                  </Button>
                </div>
                <div className="border border-border rounded-lg max-h-75 overflow-y-auto divide-y divide-border">
                  {data.playlistItems.map((item, index) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 text-[12.5px] cursor-pointer hover:bg-accent/60 transition-colors"
                    >
                      <Checkbox
                        checked={selectedItems.has(index + 1)}
                        onCheckedChange={() => toggleItem(index + 1)}
                        className="w-4 h-4 shrink-0"
                      />
                      <span className="text-muted-foreground w-4 text-[12px] font-medium text-right shrink-0">
                        {index + 1}
                      </span>
                      <div className="relative w-14 h-9 bg-secondary rounded flex items-center justify-center overflow-hidden shrink-0">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <Video className="w-3.5 h-3.5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className="truncate font-medium">{item.title}</span>
                        {item.duration && (
                          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                            {item.duration}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
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
                  variant="outline"
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
                  variant="outline"
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
                      variant="outline"
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
                          Comma-separated language codes, e.g. <code>en,zh-Hans</code>
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
          <DialogFooter className="flex items-center justify-between m-0 p-4 border-t border-border shrink-0 bg-card">
            <p className="text-[12px] text-muted-foreground">
              {isLoading
                ? "Fetching formats..."
                : getTotalSize()
                  ? `Estimated ${getTotalSize()}`
                  : "Size unknown"}
              {!isLoading && isPlaylist && ` · ${getItemCount()} items`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="px-3.5 py-2 rounded-lg text-[13px] h-auto"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground flex items-center gap-1.5 h-auto"
                disabled={isLoading || !selectedPreset || (isPlaylist && selectedItems.size === 0)}
              >
                <Download className="w-3.5 h-3.5" />
                {isPlaylist && selectedItems.size > 0
                  ? `Download ${selectedItems.size} items`
                  : "Add to queue"}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
