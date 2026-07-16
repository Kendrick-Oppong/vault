export interface DependencyStatus {
  name: string;
  installed: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface DependenciesCheckResult {
  ready: boolean;
  ytDlp: DependencyStatus;
  ffmpeg: DependencyStatus;
  errors: string[];
  errorMessage: string | null;
}
