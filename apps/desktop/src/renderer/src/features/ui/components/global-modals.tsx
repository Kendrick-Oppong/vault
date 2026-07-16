import { useModalStore } from "@/stores/ui/modal.store";
import {
  selectFormatModal,
  selectConfirmDialog,
  selectLogsModal,
  selectQuickActions,
  useModalActions
} from "@/stores/ui/modal.selectors";
import { FormatModal } from "@/features/modals/format-modal/components/format-modal";
import { ConfirmationDialog } from "@/features/ui/components/confirmation-dialog";
import { LogsModal } from "@/features/modals/logs-modal/logs-modal";
import { VideoPreviewModal } from "@/features/modals/video-preview-modal/video-preview-modal";
import { QuickActionsWindow } from "@/features/quick-actions/quick-actions-window";

export const GlobalModals = () => {
  const formatModal = useModalStore(selectFormatModal);
  const confirmDialog = useModalStore(selectConfirmDialog);
  const logsModal = useModalStore(selectLogsModal);
  const quickActions = useModalStore(selectQuickActions);
  const {
    closeFormatModal,
    closeConfirmDialog,
    closeLogsModal,
    closeQuickActions
  } = useModalActions();

  return (
    <>
      {/* Format picker modal – triggered when probing a URL.
          Renders even when data is null so the loading skeleton shows. */}
      {formatModal.isOpen && (
        <FormatModal
          open={formatModal.isOpen}
          onOpenChange={(open) => !open && closeFormatModal()}
          data={
            formatModal.data ?? {
              title: "Loading…",
              channel: "",
              type: "video" as const,
              videoFormats: [],
              audioFormats: []
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

      {/* Logs modal – view application logs */}
      <LogsModal open={logsModal.isOpen} onOpenChange={(open) => !open && closeLogsModal()} />

      {/* Video preview modal – self-contained, reads from video-preview store */}
      <VideoPreviewModal />

      {/* Quick actions mini-window – triggered from tray or keyboard */}
      {quickActions.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-80 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            <QuickActionsWindow onClose={closeQuickActions} />
          </div>
        </div>
      )}
    </>
  );
};
