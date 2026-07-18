import { Button } from "@vault/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@vault/ui/components/dialog";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: string | null;
  onRetry?: () => void;
}

export const ErrorState = ({ open, onOpenChange, error, onRetry }: ErrorStateProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col p-8 overflow-hidden rounded-2xl border-border">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <DialogTitle className="text-lg font-medium">Failed to load info</DialogTitle>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              {error || "An unknown error occurred."}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {onRetry && (
              <Button onClick={onRetry} className="bg-primary text-primary-foreground">
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
