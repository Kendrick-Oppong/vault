import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@vault/ui/components/context-menu";
import { RefreshCw, FolderOpen, Trash2 } from "lucide-react";
import type { Channel } from "../types";

interface ChannelContextMenuProps {
  children: React.ReactNode;
  channel: Channel;
  onSync: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onRemove: (id: string) => void;
}

export const ChannelContextMenu = ({
  children,
  channel,
  onSync,
  onOpenFolder,
  onRemove
}: ChannelContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={(props) => <div {...props}>{children}</div>} />
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => onSync(channel.id)} className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Sync now
        </ContextMenuItem>

        <ContextMenuItem
          onClick={() => onOpenFolder(channel.id)}
          className="flex items-center gap-2"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Open destination folder
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={() => onRemove(channel.id)}
          className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive!" />
          Remove channel
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
