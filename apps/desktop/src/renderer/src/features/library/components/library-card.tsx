import { Play, Video, Music, RefreshCw } from "lucide-react";
import { LibraryContextMenu } from "./library-context-menu";
import type { LibraryItem } from "../types";

interface LibraryCardProps {
  item: LibraryItem;
  onPlay: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onCopyLink: (id: string) => void;
  onDelete: (id: string) => void;
}

export const LibraryCard = ({
  item,
  onPlay,
  onOpenFolder,
  onCopyLink,
  onDelete
}: LibraryCardProps) => {
  const isVideo = item.type === "video";

  return (
    <LibraryContextMenu
      item={item}
      onPlay={onPlay}
      onOpenFolder={onOpenFolder}
      onCopyLink={onCopyLink}
      onDelete={onDelete}
    >
      <div
        className="group cursor-pointer rounded-xl overflow-hidden border border-border bg-card hover:bg-card-hover transition-colors"
        onClick={() => onPlay(item.id)}
      >
        <div className="relative aspect-video overflow-hidden bg-secondary">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background" />

          {/* Icon pattern */}
          <div className="absolute inset-0 flex items-center justify-center text-white/10">
            {isVideo ? <Video className="w-16 h-16" /> : <Music className="w-16 h-16" />}
          </div>

          {/* Type icon */}
          <span className="absolute top-1.5 left-1.5 z-10 opacity-80">
            {isVideo ? (
              <Video className="w-3 h-3 text-foreground" />
            ) : (
              <Music className="w-3 h-3 text-foreground" />
            )}
          </span>

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors z-10">
            <div className="w-9 h-9 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all scale-90 group-hover:scale-100">
              <Play className="w-4 h-4 text-transparent group-hover:text-black transition-colors" />
            </div>
          </div>

          {/* Quality badge */}
          <span className="absolute bottom-1.5 right-1.5 z-10 chip bg-secondary border-border/10 text-foreground/80 text-[10px] px-2 py-0.5 rounded">
            {item.quality}
          </span>
        </div>

        <div className="p-3">
          <p className="text-[12.5px] font-medium truncate">{item.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{item.channel}</p>
          <div className="flex items-center justify-between mt-1.5 text-[10.5px] text-muted-foreground">
            <span>{formatTimeAgo(item.addedAt)}</span>
            <span>{item.size}</span>
          </div>
          {item.isRecovered && (
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              recovered via retry
            </p>
          )}
        </div>
      </div>
    </LibraryContextMenu>
  );
};

// Helper function
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}
