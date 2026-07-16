import { useVideoPreviewState, useVideoPreviewActions } from "@/stores/video-preview/video-preview.selectors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@vault/ui/components/dialog";
import { Button } from "@vault/ui/components/button";
import { extractVideoId } from "@/lib/utils/youtube";

export const VideoPreviewModal = () => {
  const { isOpen, video } = useVideoPreviewState();
  const { close } = useVideoPreviewActions();

  if (!video) return null;

  const videoId = extractVideoId(video.url);
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0`;

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{video.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{video.channel}</p>
            {video.duration && (
              <p className="text-xs text-muted-foreground">
                Duration: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, "0")}
              </p>
            )}
            {video.description && (
              <p className="text-sm line-clamp-3 text-foreground/80">{video.description}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={close}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
