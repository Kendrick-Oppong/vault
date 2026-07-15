import { useModalStore } from "@/stores/ui/modal.store";
import {
  selectFormatModal,
  selectConfirmDialog,
  useModalActions
} from "@/stores/ui/modal.selectors";
import { FormatModal } from "@/features/modals/format-modal/components/format-modal";
import { ConfirmationDialog } from "@/features/ui/components/confirmation-dialog";

export const GlobalModals = () => {
  const formatModal = useModalStore(selectFormatModal);
  const confirmDialog = useModalStore(selectConfirmDialog);
  const { closeFormatModal, closeConfirmDialog } = useModalActions();

  return (
    <>
      {formatModal.data && (
        <FormatModal
          open={formatModal.isOpen}
          onOpenChange={(open) => !open && closeFormatModal()}
          data={formatModal.data}
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
