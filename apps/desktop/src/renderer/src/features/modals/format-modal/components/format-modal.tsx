import { useState } from "react";
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
import { Video, Music, ListOrdered, Download, Info } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";
import type { FormatModalData, MediaType, VideoFormat, AudioFormat } from "../types";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";

interface FormatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: FormatModalData;
  onConfirm: (options: FormatOptions) => void;
}

export interface FormatOptions {
  mediaType: MediaType;
  videoFormat?: VideoFormat;
  audioFormat?: AudioFormat;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  subtitles: "none" | "external" | "burned";
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
  const [destination, setDestination] = useState(settings.downloadPath);
  const [selectedItems, setSelectedItems] = useState<string[]>(
    () => data.playlistItems?.slice(0, 12) ?? []
  );

  const handleConfirm = () => {
    onConfirm({
      mediaType,
      videoFormat: mediaType === "video" ? selectedVideoFormat || undefined : undefined,
      audioFormat: mediaType === "audio" ? selectedAudioFormat || undefined : undefined,
      embedThumbnail,
      embedMetadata,
      subtitles,
      destination,
      selectedItems: data.type === "playlist" ? selectedItems : undefined
    });
    onOpenChange(false);
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  const getTotalSize = () => {
    const format = mediaType === "video" ? selectedVideoFormat : selectedAudioFormat;
    if (!format) return "0 MB";

    const itemSize = format.sizeBytes;
    const count = data.type === "playlist" ? selectedItems.length : 1;
    const total = itemSize * count;
    return formatSize(total);
  };

  const getBadges = () => {
    const badges: {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }[] = [];
    if (data.type === "playlist") {
      badges.push({ label: "Playlist", variant: "default" });
      badges.push({ label: `${data.videoCount} videos`, variant: "secondary" });
    } else if (data.type === "channel") {
      badges.push({ label: "Channel", variant: "default" });
    } else {
      badges.push({ label: data.duration || "Video", variant: "secondary" });
    }
    return badges;
  };

  const isPlaylist = data.type === "playlist";
  const isChannel = data.type === "channel";
  const isAllSelected = selectedItems.length === data.playlistItems?.length;

  const handleToggleSelect = () => {
    if (isAllSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(data.playlistItems || []);
    }
  };

  // Get the current selection count for display
  const getItemCount = () => {
    if (isPlaylist) {
      return selectedItems.length;
    }
    return 1;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl! max-h-[75vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border">
        {/* Header */}
        <DialogHeader className="flex items-start gap-4 p-5 border-b border-border shrink-0">
          {/* Thumbnail */}
          <div className="relative w-28 h-16 rounded-lg shrink-0 overflow-hidden bg-secondary">
            <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-background" />
            <div className="absolute inset-0 flex items-center justify-center text-white/10">
              {mediaType === "audio" ? <Music className="w-8" /> : <Video className="w-8" />}
            </div>
            <span className="absolute top-1.5 left-1.5 z-10 opacity-80">
              {mediaType === "audio" ? (
                <Music className="w-3 h-3 text-white" />
              ) : (
                <Video className="w-3 h-3 text-white" />
              )}
            </span>
          </div>

          {/* Title & Info */}
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-medium text-sm truncate">{data.title}</DialogTitle>
            <p className="text-[12px] text-muted-foreground mt-0.5">{data.channel}</p>
            <div className="flex items-center gap-2 mt-2">
              {getBadges().map((badge, i) => (
                <Badge
                  key={i.toString()}
                  variant={badge.variant as "default" | "secondary"}
                  className="text-[10px] px-2 py-0.5"
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Playlist Items */}
          {isPlaylist && data.playlistItems && (
            <div className="space-y-2">
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
              <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                {data.playlistItems.slice(0, 12).map((item, index) => (
                  <label
                    key={item}
                    className="flex items-center gap-2.5 p-3 text-[12.5px] cursor-pointer hover:bg-accent/60 transition-colors"
                  >
                    <Checkbox
                      checked={selectedItems.includes(item)}
                      onCheckedChange={() => {
                        setSelectedItems((prev) =>
                          prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
                        );
                      }}
                      className="w-4 h-4 shrink-0"
                    />
                    <span className="text-muted-foreground w-6 text-[11px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate flex-1">{item}</span>
                  </label>
                ))}
                {data.playlistItems.length > 12 && (
                  <div className="px-3 py-2 text-[11.5px] text-muted-foreground text-center">
                    + {data.playlistItems.length - 12} more videos
                  </div>
                )}
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
                      selectedVideoFormat === format
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
                    <div className="flex gap-1">
                      {format.fps.map((fps) => (
                        <Badge key={fps} variant="secondary" className="text-[10px]">
                          {fps}fps
                        </Badge>
                      ))}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {format.codec}
                    </Badge>
                    <div className="flex-1" />
                    <div className="w-14 h-1.5 rounded-full bg-secondary overflow-hidden shrink-0">
                      <div
                        className="h-full bg-primary/50 rounded-full"
                        style={{
                          width: `${(format.sizeBytes / data.videoFormats[0].sizeBytes) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-[11.5px] text-muted-foreground w-16 text-right">
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
                      selectedAudioFormat === format
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
                    <div className="w-14 h-1.5 rounded-full bg-secondary overflow-hidden shrink-0">
                      <div
                        className="h-full bg-primary/50 rounded-full"
                        style={{
                          width: `${(format.sizeBytes / data.audioFormats[0].sizeBytes) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-[11.5px] text-muted-foreground w-16 text-right">
                      {format.size}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Post-processing */}
          <div className="space-y-3">
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

            <div className="flex items-center gap-3">
              <Label className="text-[13px] text-muted-foreground w-24 shrink-0">Subtitles</Label>
              <Select
                value={subtitles}
                onValueChange={(value) => setSubtitles(value as typeof subtitles)}
              >
                <SelectTrigger className="flex-1 bg-secondary/60 border-border text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="external">Save as .srt file</SelectItem>
                  <SelectItem value="burned">Burn into video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-[13px] text-muted-foreground w-24 shrink-0">Save to</Label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="flex-1 bg-secondary/60 border-border text-[12.5px]"
              />
            </div>
          </div>

          {/* Duplicate Warning */}
          {data.duplicate && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-[12.5px] text-primary">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>This is already in your library. Adding it again saves a second copy.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between m-0 p-4 border-t border-border shrink-0">
          <p className="text-[12px] text-muted-foreground">
            Estimated {getTotalSize()}
            {isPlaylist && ` · ${getItemCount()} items`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-2 rounded-lg text-[13px] h-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground flex items-center gap-1.5 h-auto"
              disabled={!selectedVideoFormat && !selectedAudioFormat}
            >
              <Download className="w-3.5 h-3.5" />
              {isChannel ? "Sync channel" : "Add to queue"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
