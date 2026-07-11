import { useState } from "react";
import { Input } from "@vault/ui/components/input";
import { Link2 } from "lucide-react";
import { CommandMenu } from "./command-menu";
import { Button } from "@vault/ui/components/button";
import { Kbd } from "@vault/ui/components/kbd";
import { getModifierKey } from "@/lib/utils/platform";
import {
  mockVideoData,
  mockPlaylistData,
  mockChannelData
} from "@/features/modals/format-modal/mock-data";
import { useModalActions } from "@/stores/ui/modal.selectors";
import { toast } from "sonner";

export const LinkInput = () => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const { openFormatModal } = useModalActions();

  const detectUrlType = (input: string) => {
    if (input.includes("playlist")) return "playlist";
    if (input.includes("@") || input.includes("/@")) return "channel";
    return "video";
  };

  const handleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && url.trim()) {
      const type = detectUrlType(url);

      // Mock data based on type
      let data;
      if (type === "playlist") {
        data = mockPlaylistData;
      } else if (type === "channel") {
        data = mockChannelData;
      } else {
        data = mockVideoData;
      }

      openFormatModal(
        {
          ...data,
          title: type === "channel" ? `Sync channel — ${url}` : data.title,
          channel: type === "channel" ? url : data.channel,
          type
        },
        (options) => {
          console.log("Format options:", options);
          toast.success("Added to queue!");
          setUrl("");
        }
      );
    }
  };

  return (
    <div className="relative flex-1">
      <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="url-input"
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleSubmit}
        placeholder="Paste a YouTube video, playlist, or channel URL"
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
          <Kbd className="bg-transparent">{getModifierKey()}</Kbd>
          <Kbd className="bg-transparent">K</Kbd>
        </div>
      </Button>

      <CommandMenu open={open} onOpenChange={setOpen} />
    </div>
  );
};
