import { Button } from "@vault/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@vault/ui/components/tooltip";
import { X, Minus, Square } from "lucide-react";
import { useState, useEffect } from "react";
import icon from "@/assets/icon.png";

export const Titlebar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);

    globalThis.api.onWindowMaximize?.(handleMaximize);
    globalThis.api.onWindowUnmaximize?.(handleUnmaximize);

    return () => {};
  }, []);

  const handleMinimize = () => globalThis.api.minimizeWindow?.();
  const handleMaximize = () => globalThis.api.maximizeWindow?.();
  const handleClose = () => globalThis.api.closeWindow?.();

  return (
    <div className="flex items-center justify-between h-8 px-4 bg-sidebar border-b border-sidebar-border select-none [-webkit-app-region:drag]">
      <div className="text-sm font-medium text-foreground flex items-center gap-2">
        <img src={icon} alt="icon" width={20} height={20} draggable={false} />
        <span>Video Downloader</span>
      </div>

      <div className="flex items-center gap-2 ml-auto [-webkit-app-region:no-drag]">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-md hover:bg-sidebar-accent"
                onClick={handleMinimize}
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <TooltipContent side="bottom" sideOffset={6}>
            Minimize
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-md hover:bg-sidebar-accent"
                onClick={handleMaximize}
              >
                <Square className={`w-3.5 h-3.5 ${isMaximized ? "opacity-60" : ""}`} />
              </Button>
            }
          />
          <TooltipContent side="bottom" sideOffset={6}>
            {isMaximized ? "Restore" : "Maximize"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-md hover:bg-destructive/10 hover:text-destructive"
                onClick={handleClose}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <TooltipContent side="bottom" sideOffset={6}>
            Close
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
