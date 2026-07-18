import { Badge } from "@vault/ui/components/badge";
import { DialogHeader, DialogTitle } from "@vault/ui/components/dialog";
import { SkeletonLoader } from "@/features/ui/components/skeleton-loader";
import type { FormatModalData } from "../types";

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
    <DialogHeader className="absolute bottom-0 left-0 right-0 p-5 pt-12 flex flex-col justify-end text-left z-10 space-y-0">
      {isLoading ? (
        <SkeletonLoader type="format-modal-header" />
      ) : (
        <>
          <DialogTitle className="font-semibold text-xl truncate leading-tight drop-shadow-md text-foreground">
            {data.title}
          </DialogTitle>
          <p className="text-[13px] text-foreground mt-1 drop-shadow-sm font-medium">
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
