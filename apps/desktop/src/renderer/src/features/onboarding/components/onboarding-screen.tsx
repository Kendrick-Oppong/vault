import { useOnboardingState, useOnboardingActions } from "@/stores/onboarding/onboarding.selectors";
import { Button } from "@vault/ui/components/button";
import { Progress } from "@vault/ui/components/progress";
import { CheckCircle2, Download, Loader2, Play } from "lucide-react";

export const OnboardingScreen = () => {
  const {
    completed,
    currentStep,
    ytDlpDownloading,
    ffmpegDownloading,
    ytDlpProgress,
    ffmpegProgress
  } = useOnboardingState();
  const { completeOnboarding, setCurrentStep } = useOnboardingActions();

  if (completed) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center justify-center space-y-8 max-w-md w-full px-4">
        {/* Logo/Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <div className="w-12 h-12 rounded-full bg-primary/40 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">▶</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold">Setting things up</h1>
          <p className="text-sm text-muted-foreground">
            Downloading the latest yt-dlp and ffmpeg engines. This happens once and keeps the app
            self-contained.
          </p>
        </div>

        {/* Dependencies */}
        <div className="w-full space-y-4">
          {/* yt-dlp */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {ytDlpDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
                <span className="text-sm font-medium">yt-dlp</span>
              </div>
              <span className="text-xs text-muted-foreground">{ytDlpProgress}%</span>
            </div>
            <Progress value={ytDlpProgress} className="h-1" />
          </div>

          {/* ffmpeg */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {ffmpegDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
                <span className="text-sm font-medium">ffmpeg</span>
              </div>
              <span className="text-xs text-muted-foreground">{ffmpegProgress}%</span>
            </div>
            <Progress value={ffmpegProgress} className="h-1" />
          </div>
        </div>

        {/* Action Button */}
        {!ytDlpDownloading && !ffmpegDownloading ? (
          <Button
            onClick={completeOnboarding}
            className="w-full bg-primary text-primary-foreground"
          >
            <Play className="w-4 h-4 mr-2" />
            Start downloading
          </Button>
        ) : (
          <div className="w-full px-4 py-2 rounded-md bg-secondary/50 text-center text-sm text-muted-foreground">
            Downloading dependencies...
          </div>
        )}
      </div>
    </div>
  );
};
