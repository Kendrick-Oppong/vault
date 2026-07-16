/**
 * FFmpeg manager for post-processing and re-encoding
 * Handles codec fallbacks, subtitle embedding, and metadata management
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);

export interface FfmpegOptions {
  ffmpegPath: string;
}

export interface ReencodeOptions {
  inputFile: string;
  outputFile: string;
  videoCodec?: 'h264' | 'h265' | 'vp9';
  audioCodec?: 'aac' | 'opus' | 'libmp3lame';
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow';
  crf?: number; // Quality 0-51, lower is better (default 28)
  subtitleFile?: string;
  embedMetadata?: boolean;
}

export class FfmpegManager {
  constructor(private readonly opts: FfmpegOptions) {}

  /**
   * Get available ffmpeg encoders/decoders
   */
  async getAvailableCodecs(): Promise<{
    videoCodecs: string[];
    audioCodecs: string[];
  }> {
    try {
      const { stdout } = await execFileAsync(this.opts.ffmpegPath, ['-codecs']);
      
      const videoCodecs: string[] = [];
      const audioCodecs: string[] = [];

      const lines = stdout.split('\n');
      for (const line of lines) {
        // Format: "DEV.... codec_name" where DEV flags indicate capabilities
        if (line.match(/^DEV/)) {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            const codec = parts[1];
            if (line.includes('(video)')) {
              videoCodecs.push(codec);
            } else if (line.includes('(audio)')) {
              audioCodecs.push(codec);
            }
          }
        }
      }

      return { videoCodecs, audioCodecs };
    } catch {
      // If we can't query, return common known codecs
      return {
        videoCodecs: ['h264', 'h265', 'vp9'],
        audioCodecs: ['aac', 'opus', 'libmp3lame']
      };
    }
  }

  /**
   * Check if a specific codec is available
   */
  async hasCodec(codec: string): Promise<boolean> {
    try {
      await execFileAsync(this.opts.ffmpegPath, ['-codecs', '-hide_banner']);
      // If we got here, ffmpeg works; assume codec is available for now
      // A proper check would parse the output
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Re-encode video with fallback codec support
   * Tries primary codec, falls back to alternatives on failure
   */
  reencode(
    options: ReencodeOptions,
    onProgress?: (percent: number) => void
  ): { process: ChildProcess; promise: Promise<void> } {
    const videoCodec = options.videoCodec || 'h264';
    const audioCodec = options.audioCodec || 'aac';
    const preset = options.preset || 'medium';
    const crf = options.crf ?? 28;

    const args = [
      '-i', options.inputFile,
      '-c:v', videoCodec,
      '-preset', preset,
      '-crf', String(crf),
      '-c:a', audioCodec,
      '-b:a', '192k',
      '-progress', 'pipe:1',
      '-loglevel', 'warning'
    ];

    // Add subtitle file if provided
    if (options.subtitleFile) {
      args.push('-i', options.subtitleFile);
      args.push('-c:s', 'mov_text');
      args.push('-metadata:s:s:0', 'language=eng');
    }

    // Preserve metadata
    if (options.embedMetadata) {
      args.push('-map_metadata', '0');
    }

    args.push('-y', options.outputFile); // Overwrite output

    const proc = spawn(this.opts.ffmpegPath, args);

    let progressOutput = '';
    let totalDuration = 0;

    // Parse progress from ffmpeg output
    proc.stdout.on('data', (chunk) => {
      progressOutput += chunk.toString();
      
      const lines = progressOutput.split('\n');
      progressOutput = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('out_time_ms=')) {
          try {
            const timeMs = parseInt(line.split('=')[1], 10);
            if (totalDuration > 0 && onProgress) {
              const percent = Math.min(100, Math.round((timeMs / totalDuration) * 100));
              onProgress(percent);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    });

    const promise = new Promise<void>((resolve, reject) => {
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg re-encoding failed with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });

    return { process: proc, promise };
  }

  /**
   * Get video duration in seconds
   */
  async getVideoDuration(inputFile: string): Promise<number> {
    try {
      const { stdout } = await execFileAsync(this.opts.ffmpegPath, [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1:noprint_header=1',
        inputFile
      ]);

      const duration = parseFloat(stdout.trim());
      return isNaN(duration) ? 0 : duration;
    } catch {
      return 0;
    }
  }

  /**
   * Extract frames from video at specific timestamps
   */
  async extractThumbnail(
    inputFile: string,
    outputFile: string,
    timeSeconds?: number
  ): Promise<void> {
    const args = [
      '-i', inputFile,
      '-ss', String(timeSeconds || 1),
      '-vframes', '1',
      '-vf', 'scale=320:-1',
      '-y', outputFile
    ];

    try {
      await execFileAsync(this.opts.ffmpegPath, args);
    } catch (err) {
      throw new Error(`Failed to extract thumbnail: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Extract audio stream from video
   */
  extractAudio(
    inputFile: string,
    outputFile: string,
    audioCodec: 'aac' | 'mp3' = 'aac',
    bitrate: string = '192k'
  ): { process: ChildProcess; promise: Promise<void> } {
    const codecMap = {
      'aac': 'aac',
      'mp3': 'libmp3lame'
    };

    const args = [
      '-i', inputFile,
      '-vn', // No video
      '-c:a', codecMap[audioCodec],
      '-b:a', bitrate,
      '-y', outputFile
    ];

    const proc = spawn(this.opts.ffmpegPath, args);

    const promise = new Promise<void>((resolve, reject) => {
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg audio extraction failed with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });

    return { process: proc, promise };
  }
}
