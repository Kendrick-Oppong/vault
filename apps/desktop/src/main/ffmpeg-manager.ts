import { spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

export interface FfmpegOptions {
  ffmpegPath: string;
}

export interface ReencodeOptions {
  inputFile: string;
  outputFile: string;
  videoCodec?: "h264" | "h265" | "vp9";
  audioCodec?: "aac" | "opus" | "libmp3lame";
  preset?: "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow";
  crf?: number;
  subtitleFile?: string;
  embedMetadata?: boolean;
}

export async function getAvailableCodecs(
  ffmpegPath: string
): Promise<{ videoCodecs: string[]; audioCodecs: string[] }> {
  try {
    const { stdout } = await execFileAsync(ffmpegPath, ["-codecs"]);
    const videoCodecs: string[] = [];
    const audioCodecs: string[] = [];
    for (const line of stdout.split("\n")) {
      if (line.match(/^DEV/)) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          if (line.includes("(video)")) videoCodecs.push(parts[1]);
          else if (line.includes("(audio)")) audioCodecs.push(parts[1]);
        }
      }
    }
    return { videoCodecs, audioCodecs };
  } catch {
    return { videoCodecs: ["h264", "h265", "vp9"], audioCodecs: ["aac", "opus", "libmp3lame"] };
  }
}

export async function hasCodec(ffmpegPath: string, codec: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(ffmpegPath, ["-codecs", "-hide_banner"]);
    return stdout.includes(codec);
  } catch {
    return false;
  }
}

export function reencode(
  ffmpegPath: string,
  options: ReencodeOptions,
  onProgress?: (percent: number) => void
): { process: ChildProcess; promise: Promise<void> } {
  const args = [
    "-i",
    options.inputFile,
    "-c:v",
    options.videoCodec || "h264",
    "-preset",
    options.preset || "medium",
    "-crf",
    String(options.crf ?? 28),
    "-c:a",
    options.audioCodec || "aac",
    "-b:a",
    "192k",
    "-progress",
    "pipe:1",
    "-loglevel",
    "warning"
  ];

  if (options.subtitleFile) {
    args.push("-i", options.subtitleFile, "-c:s", "mov_text", "-metadata:s:s:0", "language=eng");
  }
  if (options.embedMetadata) args.push("-map_metadata", "0");
  args.push("-y", options.outputFile);

  const proc = spawn(ffmpegPath, args);
  let progressOutput = "";

  proc.stdout.on("data", (chunk) => {
    progressOutput += chunk.toString();
    const lines = progressOutput.split("\n");
    progressOutput = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("out_time_ms=") && onProgress) {
        try {
          const timeMs = parseInt(line.split("=")[1], 10);
          onProgress(Math.min(100, Math.round(timeMs / 1000)));
        } catch {
          /* ignore */
        }
      }
    }
  });

  const promise = new Promise<void>((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg re-encoding failed with code ${code}`));
    });
    proc.on("error", reject);
  });

  return { process: proc, promise };
}

export async function getVideoDuration(ffmpegPath: string, inputFile: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(ffmpegPath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1:noprint_header=1",
      inputFile
    ]);
    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? 0 : duration;
  } catch {
    return 0;
  }
}

export async function extractThumbnail(
  ffmpegPath: string,
  inputFile: string,
  outputFile: string,
  timeSeconds = 1
): Promise<void> {
  try {
    await execFileAsync(ffmpegPath, [
      "-i",
      inputFile,
      "-ss",
      String(timeSeconds),
      "-vframes",
      "1",
      "-vf",
      "scale=320:-1",
      "-y",
      outputFile
    ]);
  } catch (err) {
    throw new Error(
      `Failed to extract thumbnail: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function extractAudio(
  ffmpegPath: string,
  inputFile: string,
  outputFile: string,
  audioCodec: "aac" | "mp3" = "aac",
  bitrate = "192k"
): { process: ChildProcess; promise: Promise<void> } {
  const codecMap = { aac: "aac", mp3: "libmp3lame" };
  const args = [
    "-i",
    inputFile,
    "-vn",
    "-c:a",
    codecMap[audioCodec],
    "-b:a",
    bitrate,
    "-y",
    outputFile
  ];
  const proc = spawn(ffmpegPath, args);
  const promise = new Promise<void>((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg audio extraction failed with code ${code}`));
    });
    proc.on("error", reject);
  });
  return { process: proc, promise };
}

/** Factory for convenience when passing ffmpegPath around */
export function createFfmpegManager(opts: FfmpegOptions) {
  return {
    getAvailableCodecs: () => getAvailableCodecs(opts.ffmpegPath),
    hasCodec: (codec: string) => hasCodec(opts.ffmpegPath, codec),
    reencode: (options: ReencodeOptions, onProgress?: (percent: number) => void) =>
      reencode(opts.ffmpegPath, options, onProgress),
    getVideoDuration: (inputFile: string) => getVideoDuration(opts.ffmpegPath, inputFile),
    extractThumbnail: (inputFile: string, outputFile: string, timeSeconds?: number) =>
      extractThumbnail(opts.ffmpegPath, inputFile, outputFile, timeSeconds),
    extractAudio: (
      inputFile: string,
      outputFile: string,
      codec?: "aac" | "mp3",
      bitrate?: string
    ) => extractAudio(opts.ffmpegPath, inputFile, outputFile, codec, bitrate)
  };
}

export type FfmpegManager = ReturnType<typeof createFfmpegManager>;
