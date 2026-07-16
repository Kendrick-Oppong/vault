import { useReencodeState, useReencodeActions } from "@/stores/reencoding/reencoding.selectors";
import { Label } from "@vault/ui/components/label";
import { Switch } from "@vault/ui/components/switch";
import { Slider } from "@vault/ui/components/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@vault/ui/components/select";
import type { ReencodeFormat, VideoPreset, AudioBitrate } from "@/features/reencoding/types";

const VIDEO_PRESETS: { value: VideoPreset; label: string }[] = [
  { value: "slower", label: "Slower (best quality)" },
  { value: "slow", label: "Slow" },
  { value: "medium", label: "Medium (default)" },
  { value: "fast", label: "Fast" },
  { value: "faster", label: "Faster (worst quality)" },
  { value: "veryfast", label: "Very Fast (fastest)" }
];

const AUDIO_BITRATES: { value: AudioBitrate; label: string }[] = [
  { value: "320k", label: "320 kbps (highest)" },
  { value: "256k", label: "256 kbps" },
  { value: "192k", label: "192 kbps (default)" },
  { value: "128k", label: "128 kbps" },
  { value: "96k", label: "96 kbps (lowest)" }
];

export const ReencodeOptions = () => {
  const {
    enableReencoding,
    format,
    videoPreset,
    videoCrf,
    audioBitrate,
    stripAudio
  } = useReencodeState();

  const {
    setEnableReencoding,
    setFormat,
    setVideoPreset,
    setVideoCrf,
    setAudioBitrate,
    setStripAudio
  } = useReencodeActions();

  const handleFormatChange = (value: string) => {
    setFormat(value as ReencodeFormat);
  };

  const handlePresetChange = (value: string) => {
    setVideoPreset(value as VideoPreset);
  };

  const handleBitrateChange = (value: string) => {
    setAudioBitrate(value as AudioBitrate);
  };

  return (
    <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border">
      <div className="flex items-center justify-between">
        <Label htmlFor="enable-reencode" className="text-sm">
          Re-encode Video
        </Label>
        <Switch
          id="enable-reencode"
          checked={enableReencoding}
          onCheckedChange={setEnableReencoding}
        />
      </div>

      {enableReencoding && (
        <>
          <div className="space-y-2">
            <Label htmlFor="reencode-format" className="text-sm">
              Format
            </Label>
            <Select value={format} onValueChange={handleFormatChange}>
              <SelectTrigger id="reencode-format" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Re-encoding</SelectItem>
                <SelectItem value="h264-aac">H.264 + AAC (MP4)</SelectItem>
                <SelectItem value="h265-aac">H.265 + AAC (MP4)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format !== "none" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="preset" className="text-sm">
                    Preset
                  </Label>
                  <span className="text-xs text-muted-foreground">{videoPreset}</span>
                </div>
                <Select value={videoPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger id="preset" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="crf" className="text-sm">
                    Quality (CRF)
                  </Label>
                  <span className="text-xs text-muted-foreground">{videoCrf}</span>
                </div>
                <Slider
                  id="crf"
                  min={0}
                  max={51}
                  step={1}
                  value={[videoCrf]}
                  onValueChange={(v) => setVideoCrf(v[0])}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower = better quality (0-51, default 18)
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="strip-audio" className="text-sm">
                  Remove Audio
                </Label>
                <Switch
                  id="strip-audio"
                  checked={stripAudio}
                  onCheckedChange={setStripAudio}
                />
              </div>

              {!stripAudio && (
                <div className="space-y-2">
                  <Label htmlFor="audio-bitrate" className="text-sm">
                    Audio Bitrate
                  </Label>
                  <Select value={audioBitrate} onValueChange={handleBitrateChange}>
                    <SelectTrigger id="audio-bitrate" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIO_BITRATES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
