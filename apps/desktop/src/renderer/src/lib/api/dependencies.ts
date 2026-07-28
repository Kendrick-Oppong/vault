export const dependenciesApi = {
  check: () => globalThis.api.dependenciesCheck(),
  download: () => globalThis.api.dependenciesDownload(),
  update: (binary: "ytdlp" | "ffmpeg" | "all") => globalThis.api.dependenciesUpdate(binary)
};
