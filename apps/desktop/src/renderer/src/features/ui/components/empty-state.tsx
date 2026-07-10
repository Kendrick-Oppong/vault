import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@vault/ui/components/empty";
import { cn } from "@vault/ui/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  children,
  className
}: EmptyStateProps) => {
  return (
    <Empty
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        "border border-dashed border-border/60 bg-card/30 py-16",
        className
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-14 rounded-xl bg-muted/60 shadow-inner">
          <Icon className="size-8 text-muted-foreground" strokeWidth={1.5} />
        </EmptyMedia>

        <EmptyTitle className="mt-1 text-lg font-medium text-foreground">{title}</EmptyTitle>

        {description && (
          <EmptyDescription className="text-base text-muted-foreground/80 leading-relaxed max-w-[260px]">
            {description}
          </EmptyDescription>
        )}
      </EmptyHeader>

      {children && <EmptyContent className="mt-1">{children}</EmptyContent>}
    </Empty>
  );
};
