import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useOnboardingStore } from "@/stores/onboarding/onboarding.store";
import { useDependenciesCheck } from "@/lib/queries/dependencies";
import { useInstallDependencies } from "@/lib/mutations/downloads";
import { CheckCircle2, Loader2, XCircle, HardDriveDownload, Download } from "lucide-react";
import { Button } from "@vault/ui/components/button";

interface DownloadProgress {
  binary: "ytdlp" | "ffmpeg";
  stage: "checking" | "downloading" | "extracting" | "verifying" | "done" | "error";
  percent: number | null;
  message?: string;
}

export const OnboardingScreen = () => {
  const { completed, completeOnboarding } = useOnboardingStore(
    useShallow((s) => ({ completed: s.completed, completeOnboarding: s.completeOnboarding }))
  );
  const { data: deps, isLoading } = useDependenciesCheck();
  const installDependenciesMutation = useInstallDependencies();

  const [progress, setProgress] = useState<Partial<Record<"ytdlp" | "ffmpeg", DownloadProgress>>>(
    {}
  );

  useEffect(() => {
    if (!completed && deps?.ytDlp.installed && deps?.ffmpeg.installed) {
      completeOnboarding();
    }
  }, [completed, deps, completeOnboarding]);

  useEffect(() => {
    if (!globalThis.api?.onDependencyDownloadProgress) return;
    return globalThis.api.onDependencyDownloadProgress((p: DownloadProgress) => {
      setProgress((prev) => ({ ...prev, [p.binary]: p }));
    });
  }, []);

  if (completed) return null;

  const allReady = deps?.ytDlp.installed && deps?.ffmpeg.installed;

  const handleAutoInstall = () => {
    installDependenciesMutation.mutate();
  };

  const currentMessage = progress["ffmpeg"]?.message ?? progress["ytdlp"]?.message;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-125 w-125 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative flex w-full max-w-sm flex-col items-center gap-8 px-4">
        {/* Logo mark */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-primary/10" />
            <div className="absolute inset-1.5 rounded-xl bg-primary/20" />
            <HardDriveDownload className="relative h-9 w-9 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Welcome to Vault</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {installDependenciesMutation.isPending
                ? "Installing dependencies…"
                : "Checking for required dependencies…"}
            </p>
          </div>
        </div>

        {/* Dependency rows */}
        <div className="w-full space-y-2.5">
          <BinaryRow
            label="yt-dlp"
            description="Download engine"
            installed={deps?.ytDlp.installed ?? false}
            loading={isLoading}
            progress={progress["ytdlp"]}
          />
          <BinaryRow
            label="ffmpeg"
            description="Media processing"
            installed={deps?.ffmpeg.installed ?? false}
            loading={isLoading}
            progress={progress["ffmpeg"]}
          />
        </div>

        {/* Status footer */}
        <div className="flex w-full flex-col items-center gap-3">
          {isLoading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Scanning system…
            </p>
          )}
          {!isLoading && allReady && (
            <p className="flex items-center gap-2 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All dependencies found — launching…
            </p>
          )}
          {!isLoading && !allReady && !installDependenciesMutation.isPending && (
            <>
              <p className="text-center text-xs text-muted-foreground">
                Required binaries are missing. Auto-install them now.
              </p>
              <Button onClick={handleAutoInstall} className="w-full gap-2">
                <Download className="h-4 w-4" />
                Auto-install dependencies
              </Button>
            </>
          )}
          {installDependenciesMutation.isPending && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {currentMessage ?? "Downloading…"}
            </p>
          )}
          {installDependenciesMutation.error && (
            <p className="text-center text-xs text-destructive">
              {installDependenciesMutation.error instanceof Error
                ? installDependenciesMutation.error.message
                : "Installation failed"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

function BinaryRow({
  label,
  description,
  installed,
  loading,
  progress
}: Readonly<{
  label: string;
  description: string;
  installed: boolean;
  loading: boolean;
  progress?: DownloadProgress;
}>) {
  const isActive = progress && progress.stage !== "done" && progress.stage !== "error";
  const isDone = installed || progress?.stage === "done";

  const stageLabel = () => {
    if (!progress) return description;
    switch (progress.stage) {
      case "checking":
        return "Checking…";
      case "downloading":
        return progress.percent == null ? `Downloading ${progress.percent}%` : "Downloading…";
      case "extracting":
        return "Extracting…";
      case "verifying":
        return "Verifying…";
      case "done":
        return description;
      case "error":
        return "Error";
    }
  };

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border px-4 py-3 transition-colors ${
        isDone ? "border-success/20 bg-success/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold font-mono ${
              isDone ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
            }`}
          >
            {label.slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{stageLabel()}</p>
          </div>
        </div>

        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : isDone ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : isActive ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>

      {isActive && progress.percent != null && progress.percent > 0 && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
