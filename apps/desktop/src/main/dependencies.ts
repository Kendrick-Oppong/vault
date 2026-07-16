/**
 * Dependency checker for required binaries (yt-dlp, ffmpeg)
 * Verifies binaries are installed and accessible before downloads start
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);

export interface DependencyStatus {
  ytDlp: BinaryStatus;
  ffmpeg: BinaryStatus;
  allReady: boolean;
  errors: string[];
}

export interface BinaryStatus {
  installed: boolean;
  version?: string;
  path?: string;
  error?: string;
}

/**
 * Check if yt-dlp binary exists and is executable
 */
async function checkYtDlp(binaryPath: string): Promise<BinaryStatus> {
  try {
    if (!existsSync(binaryPath)) {
      return {
        installed: false,
        error: `yt-dlp not found at: ${binaryPath}`
      };
    }

    const { stdout } = await execFileAsync(binaryPath, ['--version']);
    const version = stdout.trim();

    return {
      installed: true,
      version,
      path: binaryPath
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      installed: false,
      error: `Failed to run yt-dlp: ${errorMsg}`
    };
  }
}

/**
 * Check if ffmpeg binary exists and is executable
 */
async function checkFfmpeg(binaryPath: string): Promise<BinaryStatus> {
  try {
    if (!existsSync(binaryPath)) {
      return {
        installed: false,
        error: `ffmpeg not found at: ${binaryPath}`
      };
    }

    const { stdout } = await execFileAsync(binaryPath, ['-version']);
    // Extract version from output (first line usually contains version info)
    const lines = stdout.split('\n');
    const versionLine = lines[0] || 'version unknown';

    return {
      installed: true,
      version: versionLine,
      path: binaryPath
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      installed: false,
      error: `Failed to run ffmpeg: ${errorMsg}`
    };
  }
}

/**
 * Check all dependencies
 */
export async function checkDependencies(
  ytDlpPath: string,
  ffmpegPath: string
): Promise<DependencyStatus> {
  const [ytDlpStatus, ffmpegStatus] = await Promise.all([
    checkYtDlp(ytDlpPath),
    checkFfmpeg(ffmpegPath)
  ]);

  const errors: string[] = [];

  if (!ytDlpStatus.installed) {
    errors.push(
      ytDlpStatus.error ||
      'yt-dlp is not installed. Please download it from https://github.com/yt-dlp/yt-dlp/releases'
    );
  }

  if (!ffmpegStatus.installed) {
    errors.push(
      ffmpegStatus.error ||
      'ffmpeg is not installed. Please download it from https://ffmpeg.org/download.html'
    );
  }

  return {
    ytDlp: ytDlpStatus,
    ffmpeg: ffmpegStatus,
    allReady: ytDlpStatus.installed && ffmpegStatus.installed,
    errors
  };
}

/**
 * Get user-friendly error message with installation instructions
 */
export function getDependencyErrorMessage(status: DependencyStatus): string {
  const messages: string[] = [];

  if (!status.ytDlp.installed) {
    messages.push(
      'yt-dlp is not installed.\n\n' +
      'Installation Instructions:\n' +
      '1. Visit: https://github.com/yt-dlp/yt-dlp/releases\n' +
      '2. Download the binary for your platform\n' +
      '3. Place in the "bin" directory of Vault\n\n' +
      `Current path: ${status.ytDlp.path || 'unknown'}`
    );
  }

  if (!status.ffmpeg.installed) {
    messages.push(
      'ffmpeg is not installed.\n\n' +
      'Installation Instructions:\n' +
      '1. Visit: https://ffmpeg.org/download.html\n' +
      '2. Download the binary for your platform\n' +
      '3. Place in the "bin" directory of Vault\n\n' +
      `Current path: ${status.ffmpeg.path || 'unknown'}`
    );
  }

  return messages.join('\n\n---\n\n');
}

/**
 * Verify dependency for a specific operation
 * Throws error if dependency is not available
 */
export async function requireDependency(
  type: 'ytdlp' | 'ffmpeg',
  binaryPath: string
): Promise<void> {
  const status = type === 'ytdlp'
    ? await checkYtDlp(binaryPath)
    : await checkFfmpeg(binaryPath);

  if (!status.installed) {
    throw new Error(
      `${type} is not available: ${status.error}`
    );
  }
}
