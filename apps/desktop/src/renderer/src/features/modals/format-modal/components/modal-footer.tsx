import { Button } from "@vault/ui/components/button";
import { DialogFooter } from "@vault/ui/components/dialog";
import { Download } from "lucide-react";
import type { Preset } from "@vault/types";

interface ModalFooterProps {
  isLoading: boolean;
  isPlaylist: boolean;
  selectedItemsCount: number;
  getTotalSize: () => string | null;
  getItemCount: () => number;
  onCancel: () => void;
  onConfirm: () => void;
  selectedPreset: Preset | null;
  showSizeStatus?: boolean;
}

export const ModalFooter = ({
  isLoading,
  isPlaylist,
  selectedItemsCount,
  getTotalSize,
  getItemCount,
  onCancel,
  onConfirm,
  selectedPreset,
  showSizeStatus = true
}: ModalFooterProps) => {
  const getSizeStatusText = () => {
    if (isLoading) return "Fetching formats...";

    const totalSize = getTotalSize();
    return totalSize ? `Estimated ${totalSize}` : "Size unknown";
  };

  return (
    <DialogFooter className="flex items-center justify-between m-0 p-3 border-t border-border shrink-0 bg-card">
      {showSizeStatus ? (
        <p className="text-[12px] text-muted-foreground">
        {getSizeStatusText()}
        {!isLoading && isPlaylist && ` · ${getItemCount()} items`}
        </p>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="px-3.5 py-2 rounded-lg text-[13px] h-auto"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground flex items-center gap-1.5 h-auto"
          disabled={isLoading || !selectedPreset || (isPlaylist && selectedItemsCount === 0)}
        >
          <Download className="w-3.5 h-3.5" />
          {isPlaylist && selectedItemsCount > 0
            ? `Download ${selectedItemsCount} items`
            : "Add to queue"}
        </Button>
      </div>
    </DialogFooter>
  );
};
