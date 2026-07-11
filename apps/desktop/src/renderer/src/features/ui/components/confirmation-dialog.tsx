import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@vault/ui/components/dialog";
import { Button } from "@vault/ui/components/button";
import { cn } from "@vault/ui/lib/utils";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export type ConfirmationVariant = "danger" | "warning" | "info";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  variant?: ConfirmationVariant;
  confirmText?: string;
  cancelText?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantConfig = {
  danger: {
    icon: <Trash2 className="w-5 h-5" />,
    confirmVariant: "destructive" as const,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    borderColor: "border-destructive/20"
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    confirmVariant: "default" as const,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    borderColor: "border-primary/20"
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    confirmVariant: "default" as const,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    borderColor: "border-primary/20"
  }
};

export const ConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  variant = "danger",
  confirmText = "Delete",
  cancelText = "Cancel",
  icon,
  children
}: ConfirmationDialogProps) => {
  const config = variantConfig[variant];

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md! rounded-2xl border-border p-0 overflow-hidden">
        {/* Header with icon */}
        <DialogHeader className="flex flex-row items-start gap-4 p-6 pb-0">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              config.iconBg
            )}
          >
            <div className={cn("flex items-center justify-center", config.iconColor)}>
              {icon || config.icon}
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <DialogTitle className="text-base font-semibold tracking-tight">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </DialogDescription>
            )}
            {children}
          </div>
        </DialogHeader>

        {/* Footer with top border */}
        <DialogFooter className="flex flex-row items-center justify-end m-0 p-3 gap-2 border-t border-border px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-sm font-medium"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            size="sm"
            onClick={handleConfirm}
            className="h-9 px-4 text-sm font-medium"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
