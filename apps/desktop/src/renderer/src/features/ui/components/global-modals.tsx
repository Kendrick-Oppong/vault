import { useModalStore } from "@/stores/ui/modal.store";
import {
  selectFormatModal,
  selectConfirmDialog,
  useModalActions
} from "@/stores/ui/modal.selectors";
import { FormatModal } from "@/features/modals/format-modal/components/format-modal";
import { ConfirmationDialog } from "@/features/ui/components/confirmation-dialog";
import { VideoPreviewModal } from "@/features/modals/video-preview-modal/video-preview-modal";

export const GlobalModals = () => {
  const formatModal = useModalStore(selectFormatModal);
  const confirmDialog = useModalStore(selectConfirmDialog);
  const { closeFormatModal, closeConfirmDialog } = useModalActions();

  return (
    <>
      {/* Format picker modal – triggered when probing a URL */}
      {formatModal.isOpen && (
        <FormatModal
          open={formatModal.isOpen}
          onOpenChange={(open) => !open && closeFormatModal()}
          data={
            formatModal.data ?? {
              id: "",
              title: "Loading…",
              channel: "",
              type: "video" as const,
              videoPresets: [],
              audioPresets: []
            }
          }
          isLoading={formatModal.isLoading}
          isError={formatModal.isError}
          error={formatModal.error}
          onRetry={formatModal.onRetry}
          onConfirm={(options) => {
            formatModal.onConfirm?.(options);
            closeFormatModal();
          }}
        />
      )}

      {/* Generic confirmation dialog */}
      <ConfirmationDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => !open && closeConfirmDialog()}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          closeConfirmDialog();
        }}
      />

      {/* Video preview modal – self-contained, reads from video-preview store */}
      <VideoPreviewModal />
    </>
  );
};
