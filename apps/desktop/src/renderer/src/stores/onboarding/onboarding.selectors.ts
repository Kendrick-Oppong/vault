import { useShallow } from "zustand/react/shallow";
import { useOnboardingStore } from "./onboarding.store";

export const useOnboardingState = () =>
  useOnboardingStore(
    useShallow((state) => ({
      completed: state.completed,
      currentStep: state.currentStep,
      ytDlpDownloading: state.ytDlpDownloading,
      ffmpegDownloading: state.ffmpegDownloading,
      ytDlpProgress: state.ytDlpProgress,
      ffmpegProgress: state.ffmpegProgress
    }))
  );

export const useOnboardingActions = () =>
  useOnboardingStore(
    useShallow((state) => ({
      startOnboarding: state.startOnboarding,
      setCurrentStep: state.setCurrentStep,
      setYtDlpDownloading: state.setYtDlpDownloading,
      setFfmpegDownloading: state.setFfmpegDownloading,
      completeOnboarding: state.completeOnboarding
    }))
  );
