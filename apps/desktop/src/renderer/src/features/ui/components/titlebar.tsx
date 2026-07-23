import { Button } from "@vault/ui/components/button";
import { cn } from "@vault/ui/lib/utils";
import { X, Minus, Square } from "lucide-react";
import { useState, useEffect } from "react";
import icon from "@/assets/icon.png";

export const Titlebar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Listen for window state changes
    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);

    globalThis.api.onWindowMaximize?.(handleMaximize);
    globalThis.api.onWindowUnmaximize?.(handleUnmaximize);

    return () => {
      // Cleanup listeners
    };
  }, []);

  const handleMinimize = () => globalThis.api.minimizeWindow?.();
  const handleMaximize = () => globalThis.api.maximizeWindow?.();
  const handleClose = () => globalThis.api.closeWindow?.();

  return (
    <div
      className={cn(
        "flex items-center justify-between h-8 px-4 bg-sidebar border-b border-sidebar-border drag select-none"
      )}
    >
      <div className="text-sm font-medium text-foreground flex items-center gap-2">
        <img src={icon} alt="icon" width={20} height={20} />
        <span>Video Downloader</span>
      </div>

      <div className="flex items-center gap-2 ml-auto no-drag">
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-md hover:bg-sidebar-accent"
          onClick={handleMinimize}
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-md hover:bg-sidebar-accent"
          onClick={handleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <Square className={`w-3.5 h-3.5 ${isMaximized ? "opacity-60" : ""}`} />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-md hover:bg-destructive/10 hover:text-destructive"
          onClick={handleClose}
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
