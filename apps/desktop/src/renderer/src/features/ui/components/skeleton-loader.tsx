export interface SkeletonLoaderProps {
  type: "format-modal-header" | "format-modal" | "queue" | "history";
}

export const SkeletonLoader = ({ type }: SkeletonLoaderProps) => {
  if (type === "format-modal-header") {
    return (
      <div className="space-y-2">
        <div className="h-5 w-3/4 bg-foreground/5 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-foreground/5 rounded animate-pulse" />
      </div>
    );
  }

  if (type === "format-modal") {
    return (
      <div className="flex-1 overflow-y-auto p-5 space-y-5 animate-pulse">
        {/* Media Type Toggle Skeleton */}
        <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-lg w-fit">
          <div className="h-8 w-20 bg-secondary rounded-md" />
          <div className="h-8 w-24 bg-transparent rounded-md" />
        </div>

        {/* Video Formats Section Skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-24 bg-secondary rounded-md" />
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skeleton-${i.toString()}`}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border h-[42px]"
              >
                <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />
                <div className="h-4 w-14 bg-secondary rounded-md shrink-0" />
                <div className="h-4 w-12 bg-secondary rounded-md shrink-0" />
                <div className="h-4 w-10 bg-secondary rounded-md shrink-0" />
                <div className="flex-1" />
                <div className="h-4 w-16 bg-secondary rounded-md shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Post-processing Skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-32 bg-secondary rounded-md" />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm border border-border shrink-0" />
              <div className="h-4 w-40 bg-secondary rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm border border-border shrink-0" />
              <div className="h-4 w-44 bg-secondary rounded-md" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "queue") {
    return (
      <div className="space-y-4 py-4 animate-pulse">
        {/* Queue Input Skeleton */}
        <div className="h-10 w-full bg-secondary rounded-lg" />

        <div className="space-y-2">
          {/* Tabs Skeleton */}
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-secondary rounded-full" />
            <div className="h-8 w-24 bg-secondary rounded-full" />
            <div className="h-8 w-16 bg-secondary rounded-full" />
          </div>

          {/* List Skeleton */}
          <div className="space-y-3 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`queue-skeleton-${i.toString()}`}
                className="flex gap-0 rounded-xl border border-border bg-card overflow-hidden h-[80px]"
              >
                <div className="w-1 shrink-0 bg-secondary" />
                <div className="flex gap-3 p-3 flex-1">
                  <div className="w-4 h-4 rounded-sm border border-border shrink-0 self-start mt-1" />
                  <div className="w-24 h-14 rounded-lg shrink-0 bg-secondary" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-3/4 bg-secondary rounded" />
                    <div className="h-3 w-1/3 bg-secondary rounded" />
                    <div className="flex gap-2 pt-1">
                      <div className="h-3 w-16 bg-secondary rounded" />
                      <div className="h-3 w-12 bg-secondary rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "history") {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`history-skeleton-${i.toString()}`}
            className="rounded-xl overflow-hidden border border-border bg-card animate-pulse"
          >
            {/* Thumbnail Skeleton */}
            <div className="relative aspect-video bg-secondary">
              {/* Type icon placeholder */}
              <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-background/20 rounded-sm" />
            </div>

            {/* Content Skeleton */}
            <div className="p-3 space-y-2.5">
              <div className="h-3.5 w-11/12 bg-secondary rounded" />
              <div className="h-3 w-2/3 bg-secondary rounded" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-2.5 w-16 bg-secondary rounded" />
                <div className="h-2.5 w-10 bg-secondary rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};
