import { usePlaylistState, usePlaylistActions } from "@/stores/playlist/playlist.selectors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@vault/ui/components/dialog";
import { Button } from "@vault/ui/components/button";
import { Checkbox } from "@vault/ui/components/checkbox";
import { formatDuration } from "@/lib/utils/format";

interface PlaylistPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

export const PlaylistPicker = ({ isOpen, onClose, onConfirm }: PlaylistPickerProps) => {
  const { items, selectedItemIds, isAllSelected } = usePlaylistState();
  const { toggleItem, toggleAllItems } = usePlaylistActions();

  const handleConfirm = () => {
    onConfirm(selectedItemIds);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Videos to Download</DialogTitle>
          <DialogDescription>
            Choose which videos from the playlist you want to download
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Select All Toggle */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={() => toggleAllItems()}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">
              {isAllSelected ? "Deselect All" : "Select All"} ({selectedItemIds.length}/{items.length})
            </span>
          </div>

          {/* Items List */}
          <div className="h-96 overflow-y-auto rounded-lg border">
            <div className="space-y-1 p-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded hover:bg-secondary/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedItemIds.includes(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.channel && (
                      <p className="text-xs text-muted-foreground">{item.channel}</p>
                    )}
                    {item.duration && (
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(item.duration)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedItemIds.length === 0}>
            Download {selectedItemIds.length > 0 ? `(${selectedItemIds.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
