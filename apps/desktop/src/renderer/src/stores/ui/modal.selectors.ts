import type { ModalStore } from "./modal.store";
import { useModalStore } from "./modal.store";
import { useShallow } from "zustand/react/shallow";

export const selectFormatModal = (state: ModalStore) => state.formatModal;
export const selectConfirmDialog = (state: ModalStore) => state.confirmDialog;

const selectModalActions = (state: ModalStore) => ({
  openFormatModal: state.openFormatModal,
  closeFormatModal: state.closeFormatModal,
  openConfirmDialog: state.openConfirmDialog,
  closeConfirmDialog: state.closeConfirmDialog
});

export const useModalActions = () => {
  return useModalStore(useShallow(selectModalActions));
};
