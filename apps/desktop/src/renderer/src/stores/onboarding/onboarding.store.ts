import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface OnboardingState {
  completed: boolean;
  currentStep: "welcome" | "dependencies" | "settings" | "complete";
  ytDlpDownloading: boolean;
  ffmpegDownloading: boolean;
  ytDlpProgress: number;
  ffmpegProgress: number;
}

export interface OnboardingActions {
  startOnboarding: () => void;
  setCurrentStep: (step: OnboardingState["currentStep"]) => void;
  setYtDlpDownloading: (downloading: boolean, progress?: number) => void;
  setFfmpegDownloading: (downloading: boolean, progress?: number) => void;
  completeOnboarding: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

const initialState: OnboardingState = {
  completed: false,
  currentStep: "welcome",
  ytDlpDownloading: false,
  ffmpegDownloading: false,
  ytDlpProgress: 0,
  ffmpegProgress: 0
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...initialState,

      startOnboarding: () =>
        set({
          completed: false,
          currentStep: "dependencies"
        }),

      setCurrentStep: (currentStep) =>
        set({ currentStep }),

      setYtDlpDownloading: (ytDlpDownloading, ytDlpProgress = 0) =>
        set({
          ytDlpDownloading,
          ytDlpProgress
        }),

      setFfmpegDownloading: (ffmpegDownloading, ffmpegProgress = 0) =>
        set({
          ffmpegDownloading,
          ffmpegProgress
        }),

      completeOnboarding: () =>
        set({
          completed: true,
          currentStep: "complete"
        })
    }),
    {
      name: "vault-onboarding",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ completed: state.completed })
    }
  )
);
