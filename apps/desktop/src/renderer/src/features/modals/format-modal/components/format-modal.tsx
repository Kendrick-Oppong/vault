import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@vault/ui/components/radio-group";
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
  AudioLines
} from "lucide-react";
import { cn } from "@vault/ui/lib/utils";
import type { FormatModalData, MediaType, VideoFormat, AudioFormat } from "../types";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { formatBytes } from "@/lib/utils/platform";
import { SkeletonLoader } from "@/features/ui/components/skeleton-loader";

interface FormatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: FormatModalData;
  isLoading?: boolean;
  isError?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onConfirm: (options: FormatOptions) => void;
}

export interface FormatOptions {
  mediaType: MediaType;
  videoFormat?: VideoFormat;
  audioFormat?: AudioFormat;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  subtitles: "none" | "external" | "burned";
  subtitleLanguages?: string[];
  reencodeFormat?: "none" | "h264-aac" | "h265-aac";
  destination: string;
  selectedItems?: string[];
}

const defaultData: FormatModalData = {
  title: "Loading...",
  channel: "",
  type: "video",
  videoFormats: [],
  audioFormats: []
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
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [selectedVideoFormat, setSelectedVideoFormat] = useState<VideoFormat | null>(() => {
    if (data.videoFormats.length === 0) return null;
    return data.videoFormats[Math.floor(data.videoFormats.length / 2)];
  });
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<AudioFormat | null>(
    () => data.audioFormats[0] ?? null
  );
  const [embedThumbnail, setEmbedThumbnail] = useState(settings.embedThumbnail);
  const [embedMetadata, setEmbedMetadata] = useState(settings.embedMetadata);
  const [subtitles, setSubtitles] = useState<"none" | "external" | "burned">("none");
  const [subtitleLanguages, setSubtitleLanguages] = useState<string[]>(["en"]);
  const [reencodeFormat, setReencodeFormat] = useState<"none" | "h264-aac" | "h265-aac">("none");
  const [destination, setDestination] = useState(settings.downloadPath);
  const [selectedItems, setSelectedItems] = useState<string[]>(
    () => data.playlistItems?.map((i) => i.id) ?? []
  );

  // Sync state when data changes (e.g. after loading finishes)
  useEffect(() => {
    if (!isLoading) {
      // Use timeout to prevent synchronous state updates during render phase
      setTimeout(() => {
        // Validate or set video format
        const isValidVideo =
          selectedVideoFormat &&
          data.videoFormats.some((f) => f.label === selectedVideoFormat.label);
        if (data.videoFormats.length > 0 && !isValidVideo) {
          setSelectedVideoFormat(data.videoFormats[Math.floor(data.videoFormats.length / 2)]);
        }
        // Validate or set audio format
        const isValidAudio =
          selectedAudioFormat &&
          data.audioFormats.some((f) => f.label === selectedAudioFormat.label);
        if (data.audioFormats.length > 0 && !isValidAudio) {
          setSelectedAudioFormat(data.audioFormats[0]);
        }
        // Validate or set playlist items
        const currentItemIds = new Set(data.playlistItems?.map((i) => i.id) || []);
        const hasValidItems =
          selectedItems.length > 0 && selectedItems.some((id) => currentItemIds.has(id));
        if (data.playlistItems && !hasValidItems) {
          setSelectedItems(data.playlistItems.map((i) => i.id));
        }
      }, 0);
    }
  }, [isLoading, data, selectedVideoFormat, selectedAudioFormat, selectedItems]);

  const handleOpenChange = (openState: boolean) => {
    if (isLoading) return; // Prevent dismissing while loading
    onOpenChange(openState);
  };

  const handleConfirm = () => {
    onConfirm({
      mediaType,
      videoFormat: mediaType === "video" ? selectedVideoFormat || undefined : undefined,
      audioFormat: mediaType === "audio" ? selectedAudioFormat || undefined : undefined,
      embedThumbnail,
      embedMetadata,
      subtitles,
      subtitleLanguages: subtitles !== "none" ? subtitleLanguages : undefined,
      reencodeFormat: reencodeFormat !== "none" ? reencodeFormat : undefined,
      destination,
      selectedItems: data.type === "playlist" ? selectedItems : undefined
    });
    onOpenChange(false);
  };

  const getTotalSize = () => {
    const format = mediaType === "video" ? selectedVideoFormat : selectedAudioFormat;
    if (!format || format.sizeBytes === 0) return null;

    const itemSize = format.sizeBytes;
    const count = data.type === "playlist" ? selectedItems.length : 1;
    return formatBytes(itemSize * count);
  };

  const getBadges = () => {
    let badges: {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }[] = [];
    if (data.type === "playlist") {
      badges = [
        { label: "Playlist", variant: "default" },
        { label: `${data.videoCount} videos`, variant: "secondary" }
      ];
    } else {
      badges = [{ label: data.duration || "Video", variant: "secondary" }];
    }
    return badges;
  };

  const isPlaylist = data.type === "playlist";
  const isAllSelected = selectedItems.length === data.playlistItems?.length;

  const handleToggleSelect = () => {
    if (isAllSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(data.playlistItems?.map((i) => i.id) || []);
    }
  };

  const getItemCount = () => {
    if (isPlaylist) {
      return selectedItems.length;
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
      <AudioLines className="w-6 h-6 text-white/40" />
    ) : (
      <Video className="w-6 h-6 text-white/40" />
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
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
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
                      variant={badge.variant as "default" | "secondary"}
                      className="text-[10px] px-2 py-0.5 border-none shadow-sm backdrop-blur-md bg-background/80"
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
                    <span className="font-medium">{selectedItems.length}</span> of{" "}
                    <span>{data.playlistItems.length}</span> selected
                  </p>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-[12px] text-primary h-auto p-0"
                    onClick={handleToggleSelect}
                  >
                    {isAllSelected ? "Deselect all" : "Select all"}
                  </Button>
                </div>
                <div className="border border-border rounded-lg max-h-[300px] overflow-y-auto divide-y divide-border">
                  {data.playlistItems.map((item, index) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 text-[12.5px] cursor-pointer hover:bg-accent/60 transition-colors"
                    >
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => {
                          const id = item.id;
                          setSelectedItems((prev) =>
                            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                          );
                        }}
                        className="w-4 h-4 shrink-0"
                      />
                      <span className="text-muted-foreground w-4 text-[10px] text-right shrink-0">
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
                        <span className="truncate">{item.title}</span>
                        {item.duration && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">
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
            <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-lg w-fit">
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

            {/* Video Formats Section */}
            {mediaType === "video" && data.videoFormats.length > 0 && (
              <div className="space-y-3">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                  Video quality
                </p>
                <div className="space-y-1.5">
                  {data.videoFormats.map((format) => (
                    <label
                      key={format.label}
                      className={cn(
                        "fm-format-row flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                        selectedVideoFormat?.label === format.label
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <RadioGroup
                        value={selectedVideoFormat?.label || ""}
                        onValueChange={() => setSelectedVideoFormat(format)}
                      >
                        <RadioGroupItem value={format.label} className="w-3.5 h-3.5" />
                      </RadioGroup>
                      <span className="text-[13px] font-medium w-14">{format.resolution}</span>
                      <div className="flex gap-1 w-20 flex-wrap">
                        {format.fps.map((fps) => (
                          <Badge key={fps} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {fps}fps
                          </Badge>
                        ))}
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {format.codec}
                      </Badge>
                      <div className="flex-1" />
                      <span className="text-[11.5px] text-muted-foreground text-right shrink-0">
                        {format.size}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Formats Section */}
            {mediaType === "audio" && data.audioFormats.length > 0 && (
              <div className="space-y-3">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                  Audio quality
                </p>
                <div className="space-y-1.5">
                  {data.audioFormats.map((format) => (
                    <label
                      key={format.label}
                      className={cn(
                        "fm-format-row flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                        selectedAudioFormat?.label === format.label
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <RadioGroup
                        value={selectedAudioFormat?.label || ""}
                        onValueChange={() => setSelectedAudioFormat(format)}
                      >
                        <RadioGroupItem value={format.label} className="w-3.5 h-3.5" />
                      </RadioGroup>
                      <span className="text-[13px] font-medium w-14">{format.label}</span>
                      <Badge
                        variant={format.lossless ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {format.lossless ? "Lossless" : format.bitrate}
                      </Badge>
                      <div className="flex-1" />
                      <span className="text-[11.5px] text-muted-foreground text-right shrink-0">
                        {format.size}
                      </span>
                    </label>
                  ))}
                </div>
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
                  Embed metadata &amp; chapters
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Label className="text-[13px] text-muted-foreground w-24 shrink-0">Subtitles</Label>
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
                    <SelectItem value="burned">Burn into video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subtitle language picker — shown when subtitles are enabled */}
              {subtitles !== "none" && (
                <div className="flex items-center gap-3">
                  <Label className="text-[13px] text-muted-foreground w-24 shrink-0">Languages</Label>
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

              {/* Re-encode option */}
              <div className="flex items-center gap-3">
                <Label className="text-[13px] text-muted-foreground w-24 shrink-0">Re-encode</Label>
                <Select
                  value={reencodeFormat}
                  onValueChange={(value) => setReencodeFormat(value as typeof reencodeFormat)}
                >
                  <SelectTrigger className="flex-1 bg-secondary/60 border-border text-[13px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No re-encoding</SelectItem>
                    <SelectItem value="h264-aac">H.264 + AAC (MP4)</SelectItem>
                    <SelectItem value="h265-aac">H.265 + AAC (MKV)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-[13px] text-muted-foreground w-24 shrink-0">Save to</Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="flex-1 bg-secondary/60 border-border text-[12.5px] h-9"
                />
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
                disabled={
                  isLoading ||
                  (!selectedVideoFormat && !selectedAudioFormat) ||
                  (isPlaylist && selectedItems.length === 0)
                }
              >
                <Download className="w-3.5 h-3.5" />
                Add to queue
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
