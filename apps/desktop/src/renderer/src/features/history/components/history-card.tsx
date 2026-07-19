import { Play, Video, Music, RefreshCw } from "lucide-react";
import { HistoryContextMenu } from "./history-context-menu";
import type { HistoryItem } from "../types";
import { getTimeAgo } from "@/lib/utils/platform";
import { useVideoPreviewActions } from "@/stores/video-preview/video-preview.selectors";
import { useOpenFile } from "@/lib/mutations/downloads";

import { Checkbox } from "@vault/ui/components/checkbox";
import { cn } from "@vault/ui/lib/utils";

interface HistoryCardProps {
  item: HistoryItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const HistoryCard = ({ item, isSelected, onSelect }: HistoryCardProps) => {
  const isVideo = item.type === "video";
  const { open: openPreview } = useVideoPreviewActions();
  const openFileMutation = useOpenFile();

  const handlePlayClick = () => {
    if (item.status === "completed" && item.filePath) {
      openFileMutation.mutate(item.filePath);
    } else if (isVideo && item.url && item.status !== "failed") {
      openPreview({
        url: item.url,
        title: item.title,
        channel: item.channel,
        thumbnail: item.thumbnail || null,
        duration: null,
        description: ""
      });
    }
  };

  return (
    <HistoryContextMenu item={item}>
      <div
        className={cn(
          "group relative cursor-pointer rounded-xl overflow-hidden border transition-colors",
          isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-card-hover"
        )}
        onClick={handlePlayClick}
      >
        <div className={cn("absolute top-2 right-2 z-20")} onClick={(e) => e.stopPropagation()}>
          <Checkbox
            className="w-5! h-5! border border-border-strong dark:border-gray-300 backdrop-blur-md"
            checked={isSelected}
            onCheckedChange={() => onSelect(item.id)}
          />
        </div>

        <div className="relative aspect-video overflow-hidden bg-secondary">
          {/* Thumbnail */}
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <>
              {/* Gradient background */}
              <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-background" />
              {/* Icon pattern */}
              <div className="absolute inset-0 flex items-center justify-center text-white/10">
                {isVideo ? <Video className="w-16 h-16" /> : <Music className="w-16 h-16" />}
              </div>
            </>
          )}

          {/* Type icon */}
          <span className="absolute top-1.5 left-1.5 z-10 opacity-80">
            {isVideo ? (
              <Video className="w-3 h-3 text-foreground" />
            ) : (
              <Music className="w-3 h-3 text-foreground" />
            )}
          </span>

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/0 group-hover:bg-background/30 transition-colors z-10">
            <div className="w-9 h-9 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all scale-90 group-hover:scale-100">
              <Play className="w-4 h-4 text-transparent group-hover:text-background transition-colors" />
            </div>
          </div>
        </div>

        <div className="p-3">
          <p className="text-[12.5px] font-medium truncate">{item.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{item.channel}</p>
          <div className="flex items-center justify-between mt-1.5 text-[10.5px] text-muted-foreground">
            <span>{getTimeAgo(item.addedAt)}</span>
          </div>
          {item.isRecovered && (
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              recovered via retry
            </p>
          )}
        </div>
      </div>
    </HistoryContextMenu>
  );
};
