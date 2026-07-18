export interface SkeletonLoaderProps {
  type: string;
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

  return null;
};
