import { create } from "zustand";
import type { FormatModalData } from "@/features/modals/format-modal/types";
import type { FormatOptions } from "@/features/modals/format-modal/components/format-modal";
import type { ConfirmationVariant } from "@/features/ui/components/confirmation-dialog";

export interface FormatModalState {
  isOpen: boolean;
  data: FormatModalData | null;
  isLoading?: boolean;
  isError?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onConfirm?: (options: FormatOptions) => void;
}

export interface ConfirmationDialogState {
  isOpen: boolean;
  title: string;
  description?: string;
  variant?: ConfirmationVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

interface ModalState {
  formatModal: FormatModalState;
  confirmDialog: ConfirmationDialogState;
}

interface ModalActions {
  openFormatModal: (
    data: FormatModalData | null,
    options?: {
      onConfirm?: (options: FormatOptions) => void;
      isLoading?: boolean;
      isError?: boolean;
      error?: string | null;
      onRetry?: () => void;
    }
  ) => void;
  updateFormatModal: (updates: Partial<FormatModalState>) => void;
  closeFormatModal: () => void;

  openConfirmDialog: (config: Omit<ConfirmationDialogState, "isOpen">) => void;
  closeConfirmDialog: () => void;
}

export type ModalStore = ModalState & ModalActions;

export const useModalStore = create<ModalStore>((set) => ({
  formatModal: {
    isOpen: false,
    data: null
  },
  confirmDialog: {
    isOpen: false,
    title: ""
  },

  openFormatModal: (data, options) =>
    set({
      formatModal: {
        isOpen: true,
        data,
        ...options
      }
    }),

  updateFormatModal: (updates) =>
    set((state) => ({
      formatModal: {
        ...state.formatModal,
        ...updates
      }
    })),

  closeFormatModal: () =>
    set((state) => ({
      formatModal: {
        ...state.formatModal,
        isOpen: false
      }
    })),

  openConfirmDialog: (config) =>
    set({
      confirmDialog: {
        ...config,
        isOpen: true
      }
    }),

  closeConfirmDialog: () =>
    set((state) => ({
      confirmDialog: {
        ...state.confirmDialog,
        isOpen: false
      }
    }))
}));
