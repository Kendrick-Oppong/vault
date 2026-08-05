import { useState } from "react";
import {
  ListPlus,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Loader2,
  Inbox,
  Video,
  Music
} from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { Textarea } from "@vault/ui/components/textarea";
import { Switch } from "@vault/ui/components/switch";
import { Checkbox } from "@vault/ui/components/checkbox";
import { Badge } from "@vault/ui/components/badge";
import { Input } from "@vault/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@vault/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@vault/ui/components/dialog";
import { cn } from "@vault/ui/lib/utils";
import { useBatchImport, type BatchMode } from "../hooks/use-batch-import";
import { PRESETS } from "@vault/types";

interface BatchImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BatchImportModal = ({ open, onOpenChange }: BatchImportModalProps) => {
  const {
    parsedUrls,
    config,
    stats,
    isQueuing,
    setConfig,
    parseInput,
    probeProgress,
    importFile,
    toggleUrl,
    selectAll,
    clear,
    queueAll
  } = useBatchImport();

  const [pasteValue, setPasteValue] = useState("");

  const modePresets = PRESETS.filter((p) => p.mediaType === config.mode);
  const allSelected = stats.valid > 0 && stats.selected === stats.valid;

  const handleParsePaste = () => {
    if (!pasteValue.trim()) return;
    parseInput(pasteValue);
  };

  const handleModeChange = (mode: BatchMode) => {
    if (!mode) return;
    const presets = PRESETS.filter((p) => p.mediaType === mode);
    setConfig({
      ...config,
      mode,
      presetId: presets[0]?.id ?? config.presetId
    });
  };

  const handleClose = () => {
    clear();
    setPasteValue("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-160! max-h-[88vh] overflow-y-auto flex flex-col gap-5 overflow-hidden rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ListPlus className="h-3.5 w-3.5" />
            </span>
            Batch Import
          </DialogTitle>
          <DialogDescription>
            Add multiple links at once. All links in a batch use the same settings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Input area */}
          <div className="flex flex-col gap-2">
            <Textarea
              placeholder={`Paste links here or import, one per line...\nhttps://youtube.com/watch?v=...\nhttps://twitter.com/user/status/...`}
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              className="h-[110px] resize-none text-[12px]"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleParsePaste} disabled={!pasteValue.trim()}>
                Parse links
              </Button>
              <div className="flex items-center gap-1.5 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={importFile}
                  className="gap-1.5 text-muted-foreground"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Import .txt
                </Button>
              </div>
            </div>
          </div>

          {/* Config row */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Settings for this batch
            </span>

            <div className="flex flex-col gap-3">
              {/* Format */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] text-muted-foreground">Format</span>
                <div className="flex items-center gap-1 bg-secondary/60 border border-border p-1 rounded-lg w-full">
                  <Button
                    variant={config.mode === "video" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 px-3.5 py-1.5 text-[12px] font-medium flex items-center justify-center gap-1.5 h-auto"
                    onClick={() => handleModeChange("video")}
                  >
                    <Video className="h-3.5 w-3.5" />
                    Video
                  </Button>
                  <Button
                    variant={config.mode === "audio" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 px-3.5 py-1.5 text-[12px] font-medium flex items-center justify-center gap-1.5 h-auto"
                    onClick={() => handleModeChange("audio")}
                  >
                    <Music className="h-3.5 w-3.5" />
                    Audio
                  </Button>
                </div>
              </div>

              {/* Quality / Bitrate */}
              <div
                className={cn(
                  "grid gap-3",
                  config.mode === "audio" ? "grid-cols-2" : "grid-cols-1"
                )}
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10.5px] text-muted-foreground">Quality</span>
                  <Select
                    value={config.presetId}
                    onValueChange={(v) => setConfig({ ...config, presetId: v as string })}
                  >
                    <SelectTrigger className="h-8! w-full text-[12px] bg-background">
                      <SelectValue placeholder="Quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {modePresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.mode === "audio" && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10.5px] text-muted-foreground">Bitrate</span>
                    <Select
                      value={String(config.audioBitrate)}
                      onValueChange={(v) => setConfig({ ...config, audioBitrate: Number(v) })}
                    >
                      <SelectTrigger className="h-8! w-full text-[12px] bg-background">
                        <SelectValue placeholder="Bitrate" />
                      </SelectTrigger>
                      <SelectContent>
                        {[320, 256, 192, 128, 96].map((kbps) => (
                          <SelectItem key={kbps} value={String(kbps)}>
                            {kbps} kbps
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Subtitles — toggle + language input */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] text-muted-foreground">Subtitles</span>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.subtitles}
                    onCheckedChange={(checked) => setConfig({ ...config, subtitles: checked })}
                  />
                  {config.subtitles && (
                    <div className="flex-1 flex flex-col gap-1">
                      <Input
                        value={config.subtitleLanguages.join(", ")}
                        onChange={(e) => {
                          const langs = e.target.value
                            .split(",")
                            .map((l) => l.trim())
                            .filter(Boolean);
                          setConfig({ ...config, subtitleLanguages: langs });
                        }}
                        placeholder="en, fr, ja, de..."
                        className="h-8 text-[12px] bg-background"
                      />
                      <span className="text-[10px] text-muted-foreground/70">
                        ISO 639-1 codes, comma-separated. e.g.{" "}
                        <code className="bg-muted px-1 rounded">en</code>{" "}
                        <code className="bg-muted px-1 rounded">fr</code>{" "}
                        <code className="bg-muted px-1 rounded">ja</code>
                      </span>
                    </div>
                  )}
                  {!config.subtitles && (
                    <span className="text-[11px] text-muted-foreground">Disabled</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview list / empty state */}
          {parsedUrls.length > 0 ? (
            <div className="flex flex-col gap-2 min-h-0 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11.5px]">
                  <Badge
                    variant="outline"
                    className="gap-1 rounded-full border-none bg-success/10 text-success"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {stats.valid} valid
                  </Badge>
                  {stats.invalid > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 rounded-full border-none bg-primary/10 text-primary"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {stats.invalid} invalid
                    </Badge>
                  )}
                  {stats.duplicates > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 rounded-full border-none bg-muted text-muted-foreground"
                    >
                      <Copy className="h-3 w-3" />
                      {stats.duplicates} duplicates
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {allSelected ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-muted-foreground"
                      onClick={() => selectAll(false)}
                    >
                      Deselect all
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-muted-foreground"
                      onClick={() => selectAll(true)}
                    >
                      Select all
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-destructive hover:text-destructive"
                    onClick={clear}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[220px] rounded-lg border border-border divide-y divide-border">
                {parsedUrls.map((item) => (
                  <label
                    key={item.url + item.status}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors",
                      item.status === "valid" && "hover:bg-muted/50 cursor-pointer",
                      item.status !== "valid" && "opacity-50"
                    )}
                  >
                    <Checkbox
                      checked={item.selected}
                      disabled={item.status !== "valid"}
                      onCheckedChange={() => toggleUrl(item.url)}
                      className="shrink-0"
                    />
                    <span className="flex-1 truncate font-mono text-[11px] text-foreground">
                      {item.url}
                    </span>

                    {item.status === "valid" && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-none bg-success/10 text-[10px] text-success/70 shrink-0"
                      >
                        Valid
                      </Badge>
                    )}
                    {item.status === "invalid" && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-none bg-primary/10 font-semibold text-[10px] text-primary shrink-0"
                      >
                        Invalid
                      </Badge>
                    )}
                    {item.status === "duplicate" && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-none bg-muted text-[10px] font-semibold text-muted-foreground shrink-0"
                      >
                        Duplicate
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
              <Inbox className="h-5 w-5 text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">Parsed links will show up here</p>
            </div>
          )}
        </div>

        {/* Probe progress indicator */}
        {isQueuing && probeProgress && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-[12px] font-medium text-foreground">Probing links…</p>
              <p className="text-[11px] text-muted-foreground">
                {probeProgress.done} of {probeProgress.total} resolved
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {Math.round((probeProgress.done / probeProgress.total) * 100)}%
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-[11.5px] text-muted-foreground">
            {stats.selected > 0
              ? `${stats.selected} link${stats.selected === 1 ? "" : "s"} ready`
              : `Paste or import links to get started`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                await queueAll();
                handleClose();
              }}
              disabled={stats.selected === 0 || isQueuing}
            >
              {isQueuing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              Queue all ({stats.selected})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
