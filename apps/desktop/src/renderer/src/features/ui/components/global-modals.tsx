import { useModalStore } from "@/stores/ui/modal.store";
import {
  selectConfirmDialog,
  selectFormatModal,
  useModalActions
} from "@/stores/ui/modal.selectors";
import { UnifiedFormatModal } from "@/features/modals/unified-format-modal";
import { ConfirmationDialog } from "@/features/ui/components/confirmation-dialog";

export const GlobalModals = () => {
  const formatModal = useModalStore(selectFormatModal);
  const confirmDialog = useModalStore(selectConfirmDialog);
  const { closeFormatModal, closeConfirmDialog } = useModalActions();
  const modalData = formatModal.data ?? {
    id: "",
    title: "Loading...",
    channel: "",
    type: "video" as const,
    platform: "youtube" as const,
    videoPresets: [],
    audioPresets: []
  };

  return (
    <>
      {formatModal.isOpen && (
        <UnifiedFormatModal
          open={formatModal.isOpen}
          onOpenChange={(open) => !open && closeFormatModal()}
          data={modalData}
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
    </>
  );
};
