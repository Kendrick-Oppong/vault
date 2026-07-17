import { useEffect, useState } from "react";

export interface DepInstallProgress {
  binary: "ytdlp" | "ffmpeg";
  stage: "checking" | "downloading" | "extracting" | "verifying" | "done" | "error";
  percent: number | null;
  message?: string;
}

export function useDepInstallProgress() {
  const [progress, setProgress] = useState<Partial<Record<"ytdlp" | "ffmpeg", DepInstallProgress>>>(
    {}
  );

  useEffect(() => {
    if (!globalThis.api?.onDependencyDownloadProgress) return;
    return globalThis.api.onDependencyDownloadProgress((p: DepInstallProgress) => {
      setProgress((prev) => ({ ...prev, [p.binary]: p }));
    });
  }, []);

  const reset = () => setProgress({});

  return { progress, reset };
}
