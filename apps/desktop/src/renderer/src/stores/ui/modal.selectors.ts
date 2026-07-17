import type { ModalStore } from "./modal.store";
import { useModalStore } from "./modal.store";
import { useShallow } from "zustand/react/shallow";

export const selectFormatModal = (state: ModalStore) => state.formatModal;
export const selectConfirmDialog = (state: ModalStore) => state.confirmDialog;
export const selectLogsModal = (state: ModalStore) => state.logsModal;
export const selectQuickActions = (state: ModalStore) => state.quickActions;

const selectModalActions = (state: ModalStore) => ({
  openFormatModal: state.openFormatModal,
  updateFormatModal: state.updateFormatModal,
  closeFormatModal: state.closeFormatModal,
  openConfirmDialog: state.openConfirmDialog,
  closeConfirmDialog: state.closeConfirmDialog,
  openLogsModal: state.openLogsModal,
  closeLogsModal: state.closeLogsModal,
  openQuickActions: state.openQuickActions,
  closeQuickActions: state.closeQuickActions
});

export const useModalActions = () => {
  return useModalStore(useShallow(selectModalActions));
};
