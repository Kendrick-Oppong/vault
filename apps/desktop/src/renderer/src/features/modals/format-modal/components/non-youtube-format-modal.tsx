import { useState } from "react";
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
import { AudioLines, FolderOpen, Music, Video, Volume2 } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";
import type { FormatModalData, FormatModalProps, MediaType, Preset } from "../types";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings, useSettingsActions } from "@/stores/settings/settings.selectors";
import { SkeletonLoader } from "@/features/ui/components/skeleton-loader";
import { useOpenFolderDialog } from "@/lib/mutations/files";
import type { AudioFormat, VideoContainer } from "@vault/types";
import { AUDIO_BITRATES, AUDIO_FORMATS, VIDEO_CONTAINERS } from "@/features/modals/lib/constants";
import { formatBytes } from "@/lib/utils/platform";
import { ErrorState } from "./error-state";
import { ModalFooter } from "./modal-footer";

const defaultData: FormatModalData = {
  id: "",
  title: "Loading...",
  channel: "",
  creatorLabel: "",
  type: "video",
  platform: "generic",
  videoPresets: [],
  audioPresets: []
};

const platformLabels: Record<string, string> = {
  twitter: "X / Twitter",
  tiktok: "TikTok",
  instagram: "Instagram",
  generic: "Media"
};

function extractHeight(resolution: string): number {
  const xMatch = /(\d{1,5})x(\d{1,5})/.exec(resolution);
  if (xMatch) return Number.parseInt(xMatch[2], 10);
  const pMatch = /(\d{1,5})p/.exec(resolution);
  return pMatch ? Number.parseInt(pMatch[1], 10) : 0;
}

function formatSizeLabel(filesize: number | null): string {
  return filesize && filesize > 0 ? formatBytes(filesize) : "Size unknown";
}

export const NonYoutubeFormatModal = ({
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
  const { updateSetting } = useSettingsActions();
  const openFolderMutation = useOpenFolderDialog();
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [formatId, setFormatId] = useState("");
  const [videoContainer, setVideoContainer] = useState<VideoContainer>(
    settings.videoContainer || "mp4"
  );
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [audioBitrate, setAudioBitrate] = useState(320);
  const [embedThumbnail, setEmbedThumbnail] = useState(settings.embedThumbnail);
  const [embedMetadata, setEmbedMetadata] = useState(settings.embedMetadata);
  const [destination, setDestination] = useState(settings.downloadPath);

  const activePresets = mediaType === "video" ? data.videoPresets : data.audioPresets;
  const effectiveSelectedPreset =
    selectedPreset && activePresets.some((preset) => preset.id === selectedPreset.id)
      ? selectedPreset
      : mediaType === "video"
        ? activePresets.find((preset) => preset.id === "best") || activePresets[0] || null
        : activePresets[0] || null;

  const handleOpenChange = (openState: boolean) => {
    if (isLoading) return;
    onOpenChange(openState);
  };

  const selectVideoPreset = (preset: Preset) => {
    setSelectedPreset(preset);
    setMediaType("video");
    if (preset.maxHeight != null && data.videoFormats) {
      const match = data.videoFormats
        .filter((f) => extractHeight(f.resolution) <= preset.maxHeight!)
        .sort((a, b) => extractHeight(b.resolution) - extractHeight(a.resolution))[0];
      setFormatId(match?.formatId || "");
      return;
    }
    setFormatId("");
  };

  const handleConfirm = () => {
    if (!effectiveSelectedPreset) return;
    const actualAudioFormat =
      mediaType === "audio" ? effectiveSelectedPreset.audioFormat || audioFormat : audioFormat;

    onConfirm({
      mediaType,
      preset: effectiveSelectedPreset,
      formatId: formatId || undefined,
      videoContainer,
      audioFormat: actualAudioFormat,
      audioBitrate:
        mediaType === "audio" && actualAudioFormat !== "flac" && actualAudioFormat !== "wav"
          ? audioBitrate
          : undefined,
      embedThumbnail,
      embedMetadata,
      embedChapters: false,
      sponsorBlock: false,
      subtitles: "none",
      destination
    });
    onOpenChange(false);
  };

  if (isError) {
    return (
      <ErrorState open={open} onOpenChange={handleOpenChange} error={error} onRetry={onRetry} />
    );
  }

  const platformLabel = platformLabels[data.platform || "generic"] || "Media";
  const creator = data.creatorLabel || data.channel || "Unknown creator";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl! max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border"
      >
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
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
            </>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-5 pt-12 z-10">
            {isLoading ? (
              <SkeletonLoader type="format-modal-header" />
            ) : (
              <>
                <h2 className="font-semibold text-xl truncate leading-tight drop-shadow-md text-foreground">
                  {data.title}
                </h2>
                <p className="text-[13px] text-foreground mt-1 drop-shadow-sm font-medium">
                  {creator}
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="text-base px-2 py-0.5 rounded-md text-primary border-none shadow-sm backdrop-blur-md bg-background/80">
                    {platformLabel}
                  </span>
                  {data.duration && (
                    <span className="text-base px-2 py-0.5 rounded-md text-primary border-none shadow-sm backdrop-blur-md bg-background/80">
                      {data.duration}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <SkeletonLoader type="format-modal" />
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
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

            <div className="flex flex-wrap gap-1.5">
              {data.videoPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="secondary"
                  size="xs"
                  onClick={() => selectVideoPreset(preset)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm uppercase transition-all duration-150",
                    effectiveSelectedPreset?.id === preset.id && mediaType === "video"
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
                    if (preset.audioFormat) setAudioFormat(preset.audioFormat);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm uppercase transition-all duration-150",
                    effectiveSelectedPreset?.id === preset.id && mediaType === "audio"
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
                <Select value={formatId} onValueChange={(v) => setFormatId(v || "")}>
                  <SelectTrigger className="w-full min-w-0">
                    {formatId ? (
                      <span className="min-w-0 truncate text-sm">
                        {(() => {
                          const selectedFormat = data.videoFormats?.find(
                            (f) => f.formatId === formatId
                          );
                          return selectedFormat
                            ? `${selectedFormat.resolution}${selectedFormat.fps ? `@${selectedFormat.fps}` : ""}`
                            : null;
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
                            {f.ext} - {formatSizeLabel(f.filesize)} - + audio
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Volume2 className="w-3 h-3 text-primary" />
                  Best available audio is automatically merged when the platform provides it.
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
                      onClick={() => setVideoContainer(container)}
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
                      onClick={() => setAudioFormat(format)}
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
                  <Select
                    value={String(audioBitrate)}
                    onValueChange={(v) => setAudioBitrate(Number(v))}
                  >
                    <SelectTrigger className="w-36">
                      <span className="text-sm">{audioBitrate} kbps</span>
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIO_BITRATES.map((bitrate) => (
                        <SelectItem key={bitrate} value={String(bitrate)}>
                          {bitrate} kbps
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
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
              </div>

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
                        if (folder) {
                          setDestination(folder);
                          updateSetting("downloadPath", folder);
                        }
                      }
                    })
                  }
                  title="Browse folders"
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isLoading && (
          <ModalFooter
            isLoading={isLoading}
            isPlaylist={false}
            selectedItemsCount={0}
            getTotalSize={() => null}
            getItemCount={() => 1}
            onCancel={() => onOpenChange(false)}
            onConfirm={handleConfirm}
            selectedPreset={effectiveSelectedPreset}
            showSizeStatus={false}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
