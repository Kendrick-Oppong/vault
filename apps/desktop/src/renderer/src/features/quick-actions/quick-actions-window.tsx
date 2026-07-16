import { useEffect, useState } from "react";
import { Button } from "@vault/ui/components/button";
import { Input } from "@vault/ui/components/input";
import { Download, Plus, X } from "lucide-react";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { useProbeFormatsMutation, useQueueDownload } from "@/lib/mutations/downloads";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings } from "@/stores/settings/settings.selectors";
import { mapProbeToFormatModalData } from "@/lib/utils/format-probe";
import { toast } from "sonner";

interface QuickActionsWindowProps {
  onClose?: () => void;
}

export const QuickActionsWindow = ({ onClose }: QuickActionsWindowProps) => {
  const [url, setUrl] = useState("");
  const settings = useSettingsStore(selectSettings);
  const { openFormatModal, updateFormatModal, closeFormatModal } = useModalActions();
  const probeMutation = useProbeFormatsMutation();
  const queueDownload = useQueueDownload();

  useEffect(() => {
    // Listen for quick actions window open event from main process
    const handleOpenQuickActions = () => {
      // Window will already be shown by main process
    };

    window.api?.onOpenQuickActions?.(handleOpenQuickActions);

    return () => {
      // Cleanup
    };
  }, []);

  const handleDownload = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      // Open format modal instantly in loading state
      openFormatModal(
        {
          title: "Loading...",
          channel: "",
          type: "video",
          videoFormats: [],
          audioFormats: []
        },
        { isLoading: true }
      );

      // Probe the URL
      probeMutation.mutate(url, {
        onSuccess: (rawFormats) => {
          try {
            const data = mapProbeToFormatModalData(rawFormats, "video");
            updateFormatModal(data);
          } catch (err) {
            updateFormatModal({
              isLoading: false,
              isError: true,
              error: "Failed to parse video information"
            });
          }
        },
        onError: (err) => {
          updateFormatModal({
            isLoading: false,
            isError: true,
            error: err instanceof Error ? err.message : "Failed to fetch video information"
          });
        }
      });

      setUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !probeMutation.isPending) {
      handleDownload();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Quick Download</h2>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6"
          onClick={onClose || (() => window.api.closeQuickActionsWindow?.())}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="p-4 space-y-3 flex-1 overflow-auto">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">YouTube URL</label>
          <Input
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-xs"
            autoFocus
          />
        </div>

        <Button
          onClick={handleDownload}
          disabled={probeMutation.isPending || !url.trim()}
          className="w-full gap-2"
          size="sm"
        >
          <Download className="w-3.5 h-3.5" />
          {probeMutation.isPending ? "Loading..." : "Download"}
        </Button>
      </div>

      <div className="p-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <p>📝 Paste URL and press Enter or click Download</p>
      </div>
    </div>
  );
};
