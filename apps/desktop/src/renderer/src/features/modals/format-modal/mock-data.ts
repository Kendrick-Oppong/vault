import type { FormatModalData } from "./types";

export const mockVideoData: FormatModalData = {
  title: "Building a Rust CLI from Scratch",
  channel: "Coding Tech",
  type: "video",
  duration: "12:41",
  videoFormats: [
    {
      label: "8K",
      resolution: "8K",
      fps: [30],
      codec: "MP4",
      size: "~4.10 GB",
      sizeBytes: 4.1 * 1024 * 1024 * 1024
    },
    {
      label: "4K",
      resolution: "4K",
      fps: [60, 30],
      codec: "MP4",
      size: "~1.76 GB",
      sizeBytes: 1.76 * 1024 * 1024 * 1024
    },
    {
      label: "1080p",
      resolution: "1080p",
      fps: [60, 30],
      codec: "MP4",
      size: "~340 MB",
      sizeBytes: 340 * 1024 * 1024
    },
    {
      label: "720p",
      resolution: "720p",
      fps: [30],
      codec: "MP4",
      size: "~160 MB",
      sizeBytes: 160 * 1024 * 1024
    },
    {
      label: "480p",
      resolution: "480p",
      fps: [30],
      codec: "MP4",
      size: "~80 MB",
      sizeBytes: 80 * 1024 * 1024
    },
    {
      label: "360p",
      resolution: "360p",
      fps: [30],
      codec: "MP4",
      size: "~40 MB",
      sizeBytes: 40 * 1024 * 1024
    } // ✅ Added 360p
  ],
  audioFormats: [
    {
      label: "FLAC",
      codec: "FLAC",
      bitrate: "Lossless",
      size: "~84 MB",
      sizeBytes: 84 * 1024 * 1024,
      lossless: true
    },
    {
      label: "WAV",
      codec: "WAV",
      bitrate: "Uncompressed",
      size: "~210 MB",
      sizeBytes: 210 * 1024 * 1024,
      lossless: true
    },
    {
      label: "MP3",
      codec: "MP3",
      bitrate: "320 kbps",
      size: "~28 MB",
      sizeBytes: 28 * 1024 * 1024
    },
    {
      label: "AAC",
      codec: "AAC",
      bitrate: "256 kbps",
      size: "~24 MB",
      sizeBytes: 24 * 1024 * 1024
    },
    {
      label: "OPUS",
      codec: "OPUS",
      bitrate: "160 kbps",
      size: "~16 MB",
      sizeBytes: 16 * 1024 * 1024
    }
  ]
};
export const mockPlaylistData: FormatModalData = {
  title: "Building a Rust CLI from Scratch",
  channel: "Coding Tech",
  type: "playlist",
  videoCount: 96,
  playlistItems: Array.from({ length: 96 }, (_, i) => `Building a Rust CLI from Scratch #${i + 1}`),
  selectedCount: 12,
  totalCount: 96,
  videoFormats: [
    {
      label: "8K",
      resolution: "8K",
      fps: [30],
      codec: "MP4",
      size: "~4.10 GB",
      sizeBytes: 4.1 * 1024 * 1024 * 1024
    },
    {
      label: "4K",
      resolution: "4K",
      fps: [60, 30],
      codec: "MP4",
      size: "~1.76 GB",
      sizeBytes: 1.76 * 1024 * 1024 * 1024
    },
    {
      label: "1080p",
      resolution: "1080p",
      fps: [60, 30],
      codec: "MP4",
      size: "~340 MB",
      sizeBytes: 340 * 1024 * 1024
    },
    {
      label: "720p",
      resolution: "720p",
      fps: [30],
      codec: "MP4",
      size: "~160 MB",
      sizeBytes: 160 * 1024 * 1024
    },
    {
      label: "480p",
      resolution: "480p",
      fps: [30],
      codec: "MP4",
      size: "~80 MB",
      sizeBytes: 80 * 1024 * 1024
    }
  ],
  audioFormats: [
    {
      label: "FLAC",
      codec: "FLAC",
      bitrate: "Lossless",
      size: "~84 MB",
      sizeBytes: 84 * 1024 * 1024,
      lossless: true
    },
    {
      label: "WAV",
      codec: "WAV",
      bitrate: "Uncompressed",
      size: "~210 MB",
      sizeBytes: 210 * 1024 * 1024,
      lossless: true
    },
    {
      label: "MP3",
      codec: "MP3",
      bitrate: "320 kbps",
      size: "~28 MB",
      sizeBytes: 28 * 1024 * 1024
    },
    {
      label: "AAC",
      codec: "AAC",
      bitrate: "256 kbps",
      size: "~24 MB",
      sizeBytes: 24 * 1024 * 1024
    },
    {
      label: "OPUS",
      codec: "OPUS",
      bitrate: "160 kbps",
      size: "~16 MB",
      sizeBytes: 16 * 1024 * 1024
    }
  ]
};

export const mockChannelData: FormatModalData = {
  title: "Sync channel — https://www.youtube.com/@bassbangers",
  channel: "https://www.youtube.com/@bassbangers",
  type: "channel",
  videoFormats: [
    {
      label: "4K",
      resolution: "4K",
      fps: [60, 30],
      codec: "MP4",
      size: "~1.76 GB",
      sizeBytes: 1.76 * 1024 * 1024 * 1024
    },
    {
      label: "1080p",
      resolution: "1080p",
      fps: [60, 30],
      codec: "MP4",
      size: "~340 MB",
      sizeBytes: 340 * 1024 * 1024
    },
    {
      label: "720p",
      resolution: "720p",
      fps: [30],
      codec: "MP4",
      size: "~160 MB",
      sizeBytes: 160 * 1024 * 1024
    }
  ],
  audioFormats: [
    {
      label: "FLAC",
      codec: "FLAC",
      bitrate: "Lossless",
      size: "~84 MB",
      sizeBytes: 84 * 1024 * 1024,
      lossless: true
    },
    {
      label: "MP3",
      codec: "MP3",
      bitrate: "320 kbps",
      size: "~28 MB",
      sizeBytes: 28 * 1024 * 1024
    },
    { label: "AAC", codec: "AAC", bitrate: "256 kbps", size: "~24 MB", sizeBytes: 24 * 1024 * 1024 }
  ]
};
