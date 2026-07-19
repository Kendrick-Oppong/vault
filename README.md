# Vault

> Advanced Desktop YouTube Downloader — a feature-rich, high-performance, local media downloader for YouTube and 1000+ other sites, powered by yt-dlp.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-39-47848f.svg)](https://www.electronjs.org/)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-powered-red.svg)](https://github.com/yt-dlp/yt-dlp)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Why Vault?](#-why-vault)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [IPC API Surface](#-ipc-api-surface)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Technology Stack](#-technology-stack)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [Legal & Disclaimer](#-legal--disclaimer)
- [License](#-license)

---

## 🎯 Overview

Vault is a **desktop application** for downloading YouTube videos and media from various platforms. Unlike web-based solutions, Vault runs entirely on your local machine:

- **No server costs** — everything runs locally on your hardware
- **No timeouts** — download hours-long content without platform limits
- **Bypass IP blocks** — use your residential IP instead of flagged data-center IPs
- **Full control** — choose formats, quality, output paths, and metadata
- **Privacy** — nothing leaves your machine except requests to the video platforms

Under the hood it is an **Electron** app with a **React 19 + Tailwind v4** renderer, a **Node.js main process** that drives **yt-dlp** and **ffmpeg**, a **worker-pool** download queue, a **better-sqlite3** database for history/archive/cache, and a **React Query + Zustand** data layer with real-time IPC event streaming.

### What Makes Vault Special?

- 🚀 **Local processing** — use your full CPU/GPU with no cloud bottlenecks
- 📦 **Zero manual setup** — yt-dlp and ffmpeg are **auto-downloaded** on first run (cross-platform, no scripts)
- 🍪 **Browser cookies** — pull cookies straight from your installed browser to download age/members-only content
- 🔎 **In-app YouTube search** — paste a URL *or* search by keyword without leaving the app
- 🎛️ **Smart presets** — one-click Best / 1080p / 720p / Audio-MP3 / Audio-FLAC, plus full manual format probing
- 📜 **History, queue & live progress** — SQLite-backed history, a concurrent queue, and real-time progress bars
- 🎨 **Modern UI** — frameless custom titlebar, light/dark themes, command palette, onboarding
- ♻️ **Self-updating** — built-in app auto-update via `electron-updater`

---

## 💡 Why Vault?

### The Problem with Web-Based Downloaders

❌ Server costs · ❌ Timeout limits · ❌ IP blocking · ❌ Privacy concerns · ❌ Rate limiting · ❌ Unreliable uptime

### The Vault Solution

✅ Zero server costs · ✅ Unlimited duration · ✅ Residential IP · ✅ Complete privacy · ✅ No shared rate limits · ✅ Offline-first, always available

### Who Is This For?

- **Content archivists** — save educational, research, or personal content
- **Creators** — download your own content at full quality
- **Privacy-focused users** — keep your downloads private
- **Power users** — advanced format selection and customization

---

## ✨ Key Features

### 📥 Download Management
- **Concurrent queue** with configurable concurrency (default 3) via a worker pool
- **Full lifecycle control** — pause, resume, retry, cancel (individually or in bulk), with confirmation dialogs
- **Job resumption** — interrupted downloads resume; the queue is ordered by creation time
- **Custom destination per job** — override the default download folder from the URL/search input
- **Download archive** — format-specific archives skip already-downloaded items, with an **overwrite** prompt when a file already exists on disk
- **Real-time progress** — live progress, speed, ETA, and status streamed over IPC

### 🎛️ Format Selection & Presets
- **Smart presets** (`packages/types/presets.ts`): `Best`, `1080p`, `720p`, `Audio MP3`, `Audio FLAC` — converted to consistent yt-dlp selectors shared by main and renderer
- **Manual probing** — inspect every available video/audio format before downloading
- **Container & codec control** — mp4/mkv containers, audio format (mp3/m4a/opus/flac/wav) and bitrate
- **Metadata embedding** — thumbnails, metadata, chapters
- **SponsorBlock** and **subtitle** options (write subtitles, choose languages)
- **Format cache** — probe results cached in SQLite (10-minute TTL) to speed up re-downloads

### 📚 History & Playlists
- **History view** (replaces the old Library) with rich cards (title, channel, thumbnail, quality, size, timestamps)
- **Filter & search tabs**, **infinite scrolling**, and **bulk delete**
- **Missing-file detection** — cards detect when a downloaded file has been moved/removed and surface clear messaging
- **Playlist support** — page-by-page playlist probing and a configurable **playlist fetch limit**
- **Channel archive** — track which videos are already downloaded per destination folder

### 🔎 Discovery & Cookies
- **In-app YouTube search** (`search:youtube`) — search by keyword, browse result cards, and queue directly
- **Browser-based cookie management** — auto-detect installed browsers and use their cookies (`cookies:info/set/refresh/clear`) for gated content
- **Subtitle listing** — enumerate available subtitle tracks for a URL

### 🖥️ Desktop Experience
- **Frameless custom titlebar** with native minimize/maximize/close and maximize/unmaximize events
- **First-run onboarding** and an **auto dependency installer** for yt-dlp + ffmpeg with per-binary download progress
- **Command palette / quick actions**, **system alert banners**, and a built-in **Logs** view
- **Light/dark themes**, toast notifications, and a storage indicator
- **App auto-update** — check, download, and install updates from within the app

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     RENDERER (React 19 UI)                    │
│  Views: Queue · History · Logs · Settings · Onboarding       │
│  State: Zustand stores  ·  Data: React Query (queries/       │
│         mutations)  ·  Real-time IPC event listeners         │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ contextBridge  (preload: window.api)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     MAIN PROCESS (Node.js)                    │
│  • ytdlp-manager   — spawn/probe/search/subtitles/playlist   │
│  • worker-pool     — queue, concurrency, pause/resume/cancel  │
│  • ffmpeg-manager  — post-processing / muxing                │
│  • dependencies    — auto-download yt-dlp + ffmpeg           │
│  • cookies         — browser cookie detection & caching      │
│  • db (SQLite)     — history · archive · format_cache        │
│  • IPC handlers + event emitters                             │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ child process
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                       yt-dlp + ffmpeg                         │
│  Download, probe formats, extract metadata/subs, mux streams  │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow
1. **User action** → renderer calls `window.api.*` (React Query mutation/query)
2. **Preload** forwards the call over IPC to the **main process**
3. **Main** validates input, hits SQLite, or spawns **yt-dlp**/**ffmpeg**
4. **yt-dlp** downloads and emits progress; the worker pool tracks job state
5. **Main** pushes `job:*` events back to the renderer over IPC
6. **Renderer** updates React Query caches → UI updates in real time; completed jobs are persisted to **history**

---

## 📁 Project Structure

```
vault/
├── apps/
│   ├── desktop/                      # Electron application
│   │   ├── bin/                      # yt-dlp / ffmpeg binaries (auto-downloaded, git-ignored)
│   │   ├── download-binaries.ps1     # Optional Windows helper (auto-download is the default)
│   │   ├── electron-builder.yml      # Packaging config
│   │   ├── electron.vite.config.ts   # Electron-Vite config + aliases
│   │   └── src/
│   │       ├── main/                 # Main process (Node.js)
│   │       │   ├── index.ts          # Entry point + IPC handlers + window/titlebar
│   │       │   ├── ytdlp-manager.ts  # yt-dlp wrapper (probe, playlist, search, subtitles)
│   │       │   ├── worker-pool.ts    # Download queue & concurrency
│   │       │   ├── ffmpeg-manager.ts # ffmpeg post-processing
│   │       │   ├── dependencies.ts   # Auto-download yt-dlp + ffmpeg
│   │       │   ├── cookies.ts        # Browser cookie detection/caching
│   │       │   ├── db.ts             # SQLite (history / archive / format_cache)
│   │       │   ├── progress-tracker.ts
│   │       │   ├── validators.ts
│   │       │   └── logger.ts
│   │       ├── preload/              # Secure IPC bridge (exposes window.api)
│   │       └── renderer/src/
│   │           ├── features/         # Feature-based UI modules
│   │           │   ├── queue/        # Queue view, url-input handler, search results, overwrite dialog
│   │           │   ├── history/      # History cards, filter tabs, bulk actions
│   │           │   ├── modals/       # Format modal (header/footer/playlist/error) + video preview
│   │           │   ├── settings/     # Settings view
│   │           │   ├── logs/         # Logs view
│   │           │   ├── onboarding/   # First-run onboarding
│   │           │   ├── dependency-checker/
│   │           │   └── ui/           # Sidebar, custom titlebar, command menu, alerts, presets
│   │           ├── stores/           # Zustand stores (navigation, settings, ui, playlist, search, …)
│   │           ├── lib/
│   │           │   ├── api/          # window.api wrappers (downloads, history, …)
│   │           │   ├── queries/      # React Query queries (history, jobs, formats)
│   │           │   ├── mutations/    # React Query mutations (downloads, history)
│   │           │   ├── event-listeners/  # Real-time IPC event hooks
│   │           │   ├── constants/    # Centralized query keys
│   │           │   └── utils/        # format-probe, youtube, platform helpers
│   │           └── providers/        # React Query & toast providers
│   │
│   └── web/                          # Next.js landing page (future)
│
├── packages/
│   ├── config/                       # Shared constants (APP_NAME, APP_VERSION)
│   ├── types/                        # Shared TS types (Job, JobInput, HistoryEntry, presets)
│   └── ui/                           # Shared shadcn/ui component library
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vault-roadmap.md
├── WORKSPACE.md
└── README.md
```

---

## 🗄️ Database Schema

SQLite (`better-sqlite3`, WAL mode). Tables are created on first launch, and the `history` table auto-migrates to add newer columns for upgrading users.

**history** — download history with metadata
```sql
CREATE TABLE history (
  job_id        TEXT PRIMARY KEY,
  video_id      TEXT,
  title         TEXT,
  channel       TEXT,
  url           TEXT,
  file_path     TEXT,
  thumbnail_url TEXT,
  status        TEXT,      -- 'completed' | 'failed' | 'cancelled'
  media_type    TEXT,      -- 'video' | 'audio'
  quality       TEXT,
  file_size     INTEGER,
  created_at    INTEGER,
  completed_at  INTEGER
);
CREATE INDEX idx_history_created_at ON history(created_at DESC);
```

**archive** — track downloaded videos per destination folder
```sql
CREATE TABLE archive (
  destination_folder TEXT,
  video_id           TEXT,
  downloaded_at      INTEGER,
  PRIMARY KEY (destination_folder, video_id)
);
```

**format_cache** — cache format-probe results (10-minute TTL)
```sql
CREATE TABLE format_cache (
  url       TEXT PRIMARY KEY,
  payload   TEXT,          -- JSON of available formats
  cached_at INTEGER
);
```

---

## 🔌 IPC API Surface

The preload script exposes a type-safe `window.api` (`VaultApi`) to the renderer. Highlights:

| Group | Methods |
|-------|---------|
| **Formats** | `probeFormats(url, playlistLimit?)`, `probePlaylistPage(url, start, end)` |
| **Queue** | `queueDownload(jobInput)`, `cancelDownload`, `pauseDownload`, `resumeDownload`, `retryDownload`, `getJobs`, `setConcurrency` |
| **History** | `getHistory(limit?, offset?)`, `deleteHistory`, `bulkDeleteHistory` |
| **Filesystem** | `openInFolder`, `openFile`, `fileExists`, `scanDir`, `openFileDialog`, `openFolderDialog` |
| **Cookies** | `getCookieInfo`, `setCookieBrowser`, `refreshCookies`, `clearCookies` |
| **Search / Subtitles** | `searchYoutube(query, page?)`, `listSubtitles(url)` |
| **Cache** | `clearFormatCache(url?)`, `clearDownloadArchive(downloadPath)` |
| **Dependencies** | `dependenciesCheck`, `dependenciesDownload`, `onDependencyDownloadProgress` |
| **App / Update** | `getAppInfo`, `checkForUpdates`, `installUpdate`, `quitApp`, `getLogsHistory` |
| **Window** | `minimizeWindow`, `maximizeWindow`, `closeWindow`, `onWindowMaximize`, `onWindowUnmaximize` |
| **Job events** | `onJobQueued`, `onJobStarted`, `onJobProgress`, `onJobCompleted`, `onJobFailed`, `onJobCancelled`, `onJobPaused` |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** — see [`.nvmrc`](./.nvmrc) (currently **24**; use `nvm use`)
- **pnpm** `>= 8` ([install](https://pnpm.io/installation))
- **Git**

> **yt-dlp and ffmpeg are handled for you.** On first launch Vault checks for the required binaries and, if missing, **auto-downloads** the correct build for your platform (Windows/macOS/Linux) into the app's data directory — no manual download needed.

### Installation

```bash
# 1. Clone
git clone https://github.com/Kendrick-Oppong/vault.git
cd vault

# 2. Install all workspaces
pnpm install

# 3. Run the desktop app (yt-dlp + ffmpeg are fetched on first run)
pnpm dev:desktop
```

### Binaries (optional / offline)

Auto-download is the default. If you prefer to provide binaries manually (e.g. offline or a locked-down network), place them in `apps/desktop/bin/<platform>/` where `<platform>` is `win32`, `darwin`, or `linux`:

```
apps/desktop/bin/<platform>/
  ├── yt-dlp(.exe)
  ├── ffmpeg(.exe)
  └── ffprobe(.exe)
```

A convenience script is available for Windows:

```powershell
cd apps/desktop
powershell -ExecutionPolicy Bypass -File .\download-binaries.ps1
```

> Binaries are git-ignored.

---

## 💻 Development

### Root scripts

```bash
pnpm dev:desktop      # Start the desktop app with hot reload
pnpm dev:web          # Start the Next.js landing page
pnpm build:desktop    # Build the desktop app
pnpm build:web        # Build the landing page
pnpm format           # Prettier across the repo
pnpm lint             # Lint all workspaces
```

### `apps/desktop` scripts

```bash
pnpm dev              # electron-vite dev
pnpm build            # typecheck + electron-vite build
pnpm build:win        # Windows installer
pnpm build:mac        # macOS .dmg
pnpm build:linux      # Linux AppImage/deb
pnpm typecheck        # tsc for main (node) and renderer (web)
pnpm lint             # eslint
```

### Import aliases

```ts
// Shared packages
import { Button } from "@vault/ui/components/button";
import type { Job, JobInput, Preset } from "@vault/types";
import { APP_NAME } from "@vault/config";

// App-local (renderer)
import { useHistory } from "@/lib/queries/history";
import { QueueView } from "@/features/queue/components/shell";
```

### Using the download API (renderer)

```ts
import { PRESETS, presetToFormatSelector, getPreset } from "@vault/types";

const preset = getPreset("1080p")!;              // { id:'1080p', mediaType:'video', maxHeight:1080 }
const formatSelector = presetToFormatSelector(preset);
// → "bestvideo[height<=1080]+bestaudio/best[height<=1080]"

await window.api.queueDownload({
  url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
  outputTemplate: "%(title)s.%(ext)s",
  formatSelector,
  downloadPath: "/path/to/Videos",
  extra: { embedThumbnail: true, embedMetadata: true, useDownloadArchive: true },
  meta: { title: "My Video", channel: "Channel Name", mediaType: "video" }
});
```

---

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| [TypeScript 5.9](https://www.typescriptlang.org/) | Type-safe development |
| [React 19](https://react.dev/) | UI library |
| [Electron 39](https://www.electronjs.org/) + [Electron-Vite](https://electron-vite.org/) | Desktop framework & build tooling |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) + [ffmpeg](https://ffmpeg.org/) | Downloading & media processing |
| [TanStack Query](https://tanstack.com/query) | Server-state management & caching |
| [Zustand](https://zustand-demo.pmnd.rs/) | Client-side state stores |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Embedded SQLite database |
| [electron-updater](https://www.electron.build/auto-update) | In-app auto-updates |
| [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | Styling & components |
| [Sonner](https://sonner.emilkowal.ski/) · [Lucide](https://lucide.dev/) | Toasts & icons |
| [pnpm](https://pnpm.io/) workspaces | Monorepo package management |
| [ESLint](https://eslint.org/) · [Prettier](https://prettier.io/) | Linting & formatting |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [WORKSPACE.md](./WORKSPACE.md) | Monorepo workspace guide |
| [vault-roadmap.md](./vault-roadmap.md) | Feature roadmap & phased plan |
| Package READMEs | See `packages/ui`, `packages/types`, `packages/config` |

---

## 🎯 Monorepo Benefits

- **Code sharing** — shared UI, types, and config across apps
- **Type safety** — types flow across package boundaries; refactor with confidence
- **Consistent tooling** — one ESLint/Prettier/TypeScript setup
- **Atomic changes** — change types, components, and apps in a single PR

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"      # desktop, web
  - "packages/*"  # ui, types, config
```

Packages are linked with `"@vault/ui": "workspace:*"` etc., so changes to a package are reflected immediately in the apps.

---

## 🤝 Contributing

1. Fork and clone the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. `pnpm install`
4. Make your changes, then `pnpm format` and `pnpm lint`
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`)
6. Open a Pull Request

### Code Style
- **TypeScript** strict mode
- **File naming**: kebab-case (`use-job-events.ts`)
- **Components**: PascalCase function names
- **Formatting**: Prettier (100-char line length)
- **Imports**: absolute imports with aliases

---

## ⚖️ Legal & Disclaimer

**Vault is intended for personal use only.** You are responsible for complying with YouTube's Terms of Service, copyright laws in your jurisdiction, and platform-specific content policies.

✅ Download your own content, Creative Commons content, or material you have permission to download; archive educational/research materials within fair use.

❌ Do not pirate copyrighted content, violate platform terms, redistribute content without permission, or circumvent DRM.

The developers of Vault are not responsible for how you use this software.

---

## 📄 License

Licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with [yt-dlp](https://github.com/yt-dlp/yt-dlp), [Electron](https://www.electronjs.org/), [React](https://react.dev/), [TanStack Query](https://tanstack.com/query), [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), and [pnpm](https://pnpm.io/).
