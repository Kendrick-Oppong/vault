import { Button } from "@vault/ui/components/button";
import { X, Minus, Square } from "lucide-react";
import { useState, useEffect } from "react";

interface TitlebarProps {
  title?: string;
}

export const CustomTitlebar = ({ title = "Vault" }: TitlebarProps) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Listen for window state changes
    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);

    window.api.onWindowMaximize?.(handleMaximize);
    window.api.onWindowUnmaximize?.(handleUnmaximize);

    return () => {
      // Cleanup listeners
    };
  }, []);

  const handleMinimize = () => window.api.minimizeWindow?.();
  const handleMaximize = () => window.api.maximizeWindow?.();
  const handleClose = () => window.api.closeWindow?.();

  return (
    <div
      className="flex items-center justify-between h-10 px-4 bg-sidebar border-b border-sidebar-border drag"
      style={{ userSelect: "none", WebkitUserSelect: "none" } as any}
    >
      <div className="text-sm font-medium text-foreground">
        {title}
      </div>

      <div className="flex items-center gap-2 ml-auto no-drag">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-md hover:bg-sidebar-accent"
          onClick={handleMinimize}
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-md hover:bg-sidebar-accent"
          onClick={handleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <Square className={`w-3.5 h-3.5 ${isMaximized ? "opacity-60" : ""}`} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-md hover:bg-destructive/10 hover:text-destructive"
          onClick={handleClose}
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
