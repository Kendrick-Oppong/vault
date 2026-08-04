import { Button } from "@vault/ui/components/button";
import { X, Download, Clipboard } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";

interface ClipboardToastContentProps {
  title: string;
  url: string;
  onQueue: () => void;
  onDismiss: () => void;
}

export const ClipboardToastContent = ({
  title,
  url,
  onQueue,
  onDismiss
}: ClipboardToastContentProps) => {
  const displayTitle = title.length > 55 ? `${title.slice(0, 52)}...` : title;
  const domain = (() => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  })();

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl bg-popover px-4 py-3",
        "shadow-sm min-w-[340px] max-w-[350px]",
        "animate-in slide-in-from-bottom-2 fade-in-0 duration-300"
      )}
    >
      {/* Header row — clipboard source indicator */}
      <div className="flex items-center gap-1.5">
        <Clipboard className="h-3 w-3 text-primary" />
        <span className="text-[10.5px] font-medium uppercase tracking-wide text-primary">
          Copied link detected
        </span>
      </div>

      {/* Content row */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-medium text-foreground truncate">{displayTitle}</p>
          <p className="text-[11px] text-muted-foreground truncate">{domain}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" className="h-7 px-3 gap-1.5 text-[12px]" onClick={onQueue}>
            <Download className="h-3 w-3" />
            Queue
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground absolute top-2 right-2"
            onClick={onDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
