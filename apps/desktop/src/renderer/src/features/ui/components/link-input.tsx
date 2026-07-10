import { useState } from "react";
import { Input } from "@vault/ui/components/input";
import { Link as LinkIcon } from "lucide-react";
import { CommandMenu } from "./command-menu";
import { Button } from "@vault/ui/components/button";
import { Kbd } from "@vault/ui/components/kbd";

export const LinkInput = () => {
  const [open, setOpen] = useState(false);

  // Detect if it's Mac or Windows
  const isMac = window.navigator.userAgent.includes("Mac");
  const modifierKey = isMac ? "⌘" : "Ctrl";

  return (
    <div className="relative flex-1">
      <LinkIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="url-input"
        type="text"
        placeholder="Paste a video, playlist, or channel link…"
        className="h-11 w-full shadow-card border-border-strong bg-secondary/30 pl-10 pr-16 text-sm focus-visible:bg-card"
      />
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Open command menu"
        className="absolute w-16! right-2.5 top-1/2 size-6 -translate-y-1/2 rounded-md border-border/60 bg-background/40 font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        <div className="flex items-center">
          <Kbd className="bg-transparent">{modifierKey}</Kbd>
          <Kbd className="bg-transparent">K</Kbd>
        </div>
      </Button>

      <CommandMenu open={open} onOpenChange={setOpen} />
    </div>
  );
};
