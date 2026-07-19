import { create } from "zustand";
import type { FormatModalData, FormatOptions } from "@/features/modals/format-modal/types";
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

export interface LogsModalState {
  isOpen: boolean;
}

export interface QuickActionsState {
  isOpen: boolean;
}

interface ModalState {
  formatModal: FormatModalState;
  confirmDialog: ConfirmationDialogState;
  logsModal: LogsModalState;
  quickActions: QuickActionsState;
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
  updateFormatModalData: (newData: FormatModalData) => void;
  closeFormatModal: () => void;

  openConfirmDialog: (config: Omit<ConfirmationDialogState, "isOpen">) => void;
  closeConfirmDialog: () => void;

  openLogsModal: () => void;
  closeLogsModal: () => void;

  openQuickActions: () => void;
  closeQuickActions: () => void;
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
  logsModal: {
    isOpen: false
  },
  quickActions: {
    isOpen: false
  },

  openFormatModal: (data, options) =>
    set({
      formatModal: {
        isOpen: true,
        data,
        ...options
      }
    }),

  // Add a helper to update modal data for Load More
  updateFormatModalData: (newData: FormatModalData) =>
    set((state) => ({
      formatModal: {
        ...state.formatModal,
        data: newData
      }
    })),

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
    })),

  openLogsModal: () => set({ logsModal: { isOpen: true } }),
  closeLogsModal: () => set({ logsModal: { isOpen: false } }),

  openQuickActions: () => set({ quickActions: { isOpen: true } }),
  closeQuickActions: () => set({ quickActions: { isOpen: false } })
}));
