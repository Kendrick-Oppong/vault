import { Badge } from "@vault/ui/components/badge";
import { DialogHeader, DialogTitle } from "@vault/ui/components/dialog";
import type { FormatModalData } from "../types";
import { SkeletonLoader } from "@renderer/features/ui/components/skeleton-loader";
import { cn } from "@vault/ui/lib/utils";

interface ModalHeaderProps {
  data: FormatModalData;
  isLoading: boolean;
}

export const ModalHeader = ({ data, isLoading }: ModalHeaderProps) => {
  const getBadges = () => {
    if (data.type === "playlist") {
      return [{ label: "Playlist" }, { label: `${data.videoCount} videos` }];
    }
    return [{ label: data.duration || "Video" }];
  };

  return (
    <DialogHeader
      className={cn(
        "absolute bottom-0 left-0 right-0 p-5 pt-3 flex flex-col justify-end text-left z-10 space-y-0 backdrop-blur-xs",
        !isLoading && "bg-black/50"
      )}
    >
      {isLoading ? (
        <SkeletonLoader type="format-modal-header" />
      ) : (
        <>
          <DialogTitle className="font-semibold text-xl truncate leading-tight drop-shadow-md text-background dark:text-foreground">
            {data.title}
          </DialogTitle>
          <p className="text-[13px] text-background mt-1 drop-shadow-sm font-medium dark:text-foreground">
            {data.channel}
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            {getBadges().map((badge, i) => (
              <Badge
                key={`badge-${i.toString()}`}
                className="text-base px-2 text-primary! py-0.5 border-none shadow-sm backdrop-blur-md bg-background/80"
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        </>
      )}
    </DialogHeader>
  );
};
