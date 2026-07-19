import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@vault/ui/components/dialog";
import { Button } from "@vault/ui/components/button";
import { AlertTriangle } from "lucide-react";

interface FileOverwriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCount: number;
  totalCount: number;
  onOverwriteAll: () => void;
  onSkipExisting: () => void;
  onCancel: () => void;
  singleFileTitle?: string;
}

export const FileOverwriteDialog = ({
  open,
  onOpenChange,
  existingCount,
  totalCount,
  onOverwriteAll,
  onSkipExisting,
  onCancel,
  singleFileTitle
}: FileOverwriteDialogProps) => {
  if (existingCount === 0 || totalCount === 0) return null;

  const isSingle = totalCount === 1;

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleOverwrite = () => {
    onOverwriteAll();
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkipExisting();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md!">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>{isSingle ? "File Already Exists" : "Files Already Exist"}</DialogTitle>
          </div>
          <DialogDescription className="space-y-4 pt-2">
            {isSingle ? (
              <div className="space-y-3">
                <p>
                  A file with the same name already exists in your download folder. What would you
                  like to do?
                </p>
                {singleFileTitle && (
                  <div className="p-3 bg-secondary/50 rounded-lg border border-border/50">
                    <p className="text-sm font-medium break-words">{singleFileTitle}</p>
                  </div>
                )}
              </div>
            ) : (
              <p>
                <strong>{existingCount}</strong> of the <strong>{totalCount}</strong> files you
                selected already exist in your download folder. What would you like to do?
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          {!isSingle && existingCount < totalCount && (
            <Button variant="outline" onClick={handleSkip}>
              Skip Existing
            </Button>
          )}
          <Button variant="default" onClick={handleOverwrite}>
            {isSingle ? "Overwrite" : "Overwrite All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
