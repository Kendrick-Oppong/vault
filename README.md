# Vault

> Advanced Desktop YouTube Downloader - A feature-rich, high-performance, local media downloader for YouTube and other video platforms
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-39.2-47848f.svg)](https://www.electronjs.org/)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-powered-red.svg)](https://github.com/yt-dlp/yt-dlp)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Why Vault?](#why-vault)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Technology Stack](#technology-stack)
- [Documentation](#documentation)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

Vault is a **powerful desktop application** for downloading YouTube videos and media from various platforms. Unlike web-based solutions, Vault runs entirely on your local machine, giving you:

- **No server costs** - Everything runs locally on your hardware
- **No timeouts** - Download hours-long content without platform limits
- **Bypass IP blocks** - Use your residential IP instead of flagged data center IPs
- **Full control** - Choose formats, quality, output paths, and metadata
- **Privacy** - No data leaves your machine except to the video platforms


- **Desktop-first** Electron application with yt-dlp integration
- **Type-safe** development with shared TypeScript types
- **Real-time progress** tracking via IPC event streaming
- **Modern UI/UX** with Tailwind CSS v4 and shadcn/ui components
- **Robust architecture** - Worker pools, SQLite database, React Query data layer

### What Makes Vault Special?

🚀 **Local processing power** - Utilize your full CPU/GPU without cloud bottlenecks  
📥 **Download queue** - Queue unlimited videos with configurable concurrency  
🎨 **Beautiful interface** - Modern design with light/dark themes  
� **History tracking** - SQLite-backed history with metadata and thumbnails  
🔄 **Channel sync** - Sync entire channels and track what's downloaded  
⚡ **Real-time updates** - Live progress bars and status updates  
🎯 **Format selection** - Probe and choose exact video/audio formats  

---

## 💡 Why Vault?

### The Problem with Web-Based Downloaders

❌ **Server costs** - Running video processing servers is expensive  
❌ **Timeout limits** - Cloud platforms kill long-running downloads  
❌ **IP blocking** - Data center IPs get flagged and blocked  
❌ **Privacy concerns** - Your viewing history passes through third-party servers  
❌ **Rate limiting** - Shared servers hit platform rate limits  
❌ **Unreliable** - Services go down or disappear

### The Vault Solution

✅ **Zero server costs** - Runs entirely on your local machine  
✅ **Unlimited duration** - Download 10-hour videos without timeouts  
✅ **Residential IP** - Use your home IP that platforms trust  
✅ **Complete privacy** - Nothing leaves your machine except platform requests  
✅ **No rate limits** - Your own IP, your own quotas  
✅ **Always available** - Offline-first, no dependencies on external services

### Who Is This For?

- **Content archivists** - Save educational, research, or personal content
- **Creators** - Download your own content with full quality
- **Privacy-focused users** - Keep your downloads private
- **Power users** - Need advanced format selection and customization
- **Anyone** tired of web-based downloader limitations

---

## ✨ Key Features

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        VAULT DESKTOP                          │
│              (YouTube Downloader Application)                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌───────▼────────┐                         ┌───────▼────────┐
│  USER          │                         │  yt-dlp        │
│  INTERFACE     │                         │  ENGINE        │
│                │                         │                │
│  • React UI    │◄────────────────────────┤  • Download    │
│  • Progress    │                         │  • Format      │
│  • History     │                         │  • Metadata    │
└────────────────┘                         └────────────────┘
        │                                           │
        └───────────────┬───────────────────────────┘
                        │
                ┌───────▼────────┐
                │  SQLite DB     │
                │  • History     │
                │  • Archive     │
                │  • Cache       │
                └────────────────┘
```

### Desktop App Architecture (Electron)

```
┌──────────────────────────────────────────────────────────────┐
│                     RENDERER (React UI)                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • Download Queue UI                                   │  │
│  │  • Progress Bars & Status                              │  │
│  │  • History Browser                                     │  │
│  │  • Format Selector                                     │  │
│  │  • Settings & Configuration                            │  │
│  │                                                         │  │
│  │  React Query: Queries, Mutations, Real-time Events    │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ IPC (contextBridge)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      MAIN PROCESS (Node.js)                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  • yt-dlp Manager - Spawns yt-dlp processes            │  │
│  │  • Worker Pool - Manages download queue/concurrency    │  │
│  │  • SQLite Database - History, archive, cache           │  │
│  │  • File System - Output path management                │  │
│  │  • IPC Handlers - API for renderer                     │  │
│  │  • Event Emitters - Push updates to renderer           │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              ▲
                              │ Child Process
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                         yt-dlp Binary                         │
│  • Download videos from YouTube & 1000+ sites                │
│  • Extract metadata, thumbnails, subtitles                   │
│  • Probe available formats                                   │
│  • Merge video + audio streams                               │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User action** → Renderer sends IPC request to Main process
2. **Main process** → Validates, queries database, or spawns yt-dlp
3. **yt-dlp** → Downloads video, emits progress events
4. **Main process** → Forwards events to Renderer via IPC
5. **Renderer** → React Query updates UI in real-time
6. **Database** → Stores history, metadata, and cache

---

## 📁 Project Structure

```
vault/
├── apps/
│   ├── desktop/                    # Main Electron application
│   │   ├── bin/                   # yt-dlp and ffmpeg binaries
│   │   │   ├── win32/
│   │   │   ├── darwin/
│   │   │   └── linux/
│   │   ├── src/
│   │   │   ├── main/              # Main process (Node.js)
│   │   │   │   ├── index.ts       # Entry point + IPC handlers
│   │   │   │   ├── db.ts          # SQLite database layer
│   │   │   │   ├── ytdlp-manager.ts  # yt-dlp wrapper
│   │   │   │   └── worker-pool.ts # Download queue manager
│   │   │   ├── preload/           # IPC bridge (security layer)
│   │   │   │   ├── index.ts       # API exposure to renderer
│   │   │   │   └── index.d.ts     # TypeScript definitions
│   │   │   └── renderer/          # Renderer process (React)
│   │   │       └── src/
│   │   │           ├── lib/       # Data layer (React Query)
│   │   │           │   ├── api/   # IPC API wrappers
│   │   │           │   │   ├── downloads.ts  # Download operations
│   │   │           │   │   ├── history.ts    # History queries
│   │   │           │   │   ├── archive.ts    # Channel archive
│   │   │           │   │   └── cache.ts      # Format cache
│   │   │           │   ├── queries/          # React Query queries
│   │   │           │   │   ├── formats.ts    # Format probing
│   │   │           │   │   └── history.ts    # History fetching
│   │   │           │   ├── mutations/        # React Query mutations
│   │   │           │   │   ├── downloads.ts  # Queue, cancel, etc.
│   │   │           │   │   ├── archive.ts    # Channel sync
│   │   │           │   │   └── cache.ts      # Cache management
│   │   │           │   ├── event-listeners/  # IPC event handlers
│   │   │           │   │   └── use-job-events.ts  # Real-time updates
│   │   │           │   ├── utils/
│   │   │           │   │   └── format-error.ts  # Error formatting
│   │   │           │   └── query-keys.ts     # Centralized query keys
│   │   │           ├── providers/            # React providers
│   │   │           │   ├── query-provider.tsx   # React Query setup
│   │   │           │   └── toast-provider.tsx   # Toast notifications
│   │   │           ├── components/           # UI components
│   │   │           │   ├── download-queue.tsx
│   │   │           │   ├── history-view.tsx
│   │   │           │   └── format-selector.tsx
│   │   │           └── assets/              # Styles
│   │   │               └── globals.css      # Tailwind theme
│   │   ├── components.json        # shadcn/ui config
│   │   ├── electron.vite.config.ts
│   │   ├── electron-builder.yml   # Build configuration
│   │   └── package.json
│   │
│   └── web/                       # Next.js landing page (future)
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   └── lib/
│       └── package.json
│
├── packages/
│   ├── config/                    # Shared configuration
│   │   ├── src/
│   │   │   └── index.ts          # Constants (APP_NAME, VERSION, etc.)
│   │   └── package.json
│   │
│   ├── types/                     # Shared TypeScript types
│   │   ├── src/
│   │   │   └── index.ts          # Job, HistoryEntry, YtDlpProgress, etc.
│   │   └── package.json
│   │
│   └── ui/                        # Shared UI components
│       ├── src/
│       │   ├── components/       # shadcn/ui components
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── input.tsx
│       │   │   └── progress.tsx
│       │   ├── lib/
│       │   │   └── utils.ts      # cn() utility
│       │   └── styles/
│       │       └── globals.css   # Base Tailwind config
│       └── package.json
│
├── .github/                       # CI/CD workflows
├── .vscode/                       # VSCode settings
├── pnpm-workspace.yaml           # Workspace configuration
├── package.json                  # Root package scripts
└── README.md                     # This file

### Key Configuration Files

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Defines workspace packages and native build allowlist |
| `components.json` | shadcn/ui configuration for each app/package |
| `electron.vite.config.ts` | Vite config with import aliases for Electron |
| `electron-builder.yml` | Electron packaging and distribution config |
| `tsconfig.web.json` | TypeScript config for renderer process |
| `globals.css` | Tailwind v4 custom theme (light/dark modes) |

### Database Schema (SQLite)

**history** - Download history with metadata
```sql
CREATE TABLE history (
  job_id TEXT PRIMARY KEY,
  video_id TEXT,
  title TEXT,
  channel TEXT,
  url TEXT,
  file_path TEXT,
  thumbnail_url TEXT,
  status TEXT,           -- 'completed', 'failed', 'cancelled'
  created_at INTEGER,
  completed_at INTEGER
);
```

**archive** - Track downloaded videos per channel
```sql
CREATE TABLE archive (
  destination_folder TEXT,
  video_id TEXT,
  downloaded_at INTEGER,
  PRIMARY KEY (destination_folder, video_id)
);
```

**format_cache** - Cache format probe results (10 min TTL)
```sql
CREATE TABLE format_cache (
  url TEXT PRIMARY KEY,
  payload TEXT,          -- JSON of available formats
  cached_at INTEGER
);
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** `>= 18.0.0` ([Download](https://nodejs.org/))
- **pnpm** `>= 8.0.0` ([Install](https://pnpm.io/installation))
- **Git** ([Download](https://git-scm.com/))

**Required for desktop app:**
- **yt-dlp** - Download from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)
- **ffmpeg** - Download from [ffmpeg.org](https://ffmpeg.org/download.html)

> **Note:** yt-dlp and ffmpeg binaries should be placed in `apps/desktop/bin/<platform>/` where `<platform>` is `win32`, `darwin`, or `linux`.

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/vault.git
cd vault
```

2. **Install dependencies**

```bash
pnpm install
```

This installs all dependencies for all workspaces using pnpm's efficient linking.

3. **Add yt-dlp and ffmpeg binaries**

Create the bin directory and add the required binaries:

```bash
# Windows
mkdir apps\desktop\bin\win32
# Download yt-dlp.exe and ffmpeg.exe to this folder

# macOS
mkdir -p apps/desktop/bin/darwin
# Download yt-dlp and ffmpeg to this folder, make executable

# Linux
mkdir -p apps/desktop/bin/linux
# Download yt-dlp and ffmpeg to this folder, make executable
```

**Download links:**
- yt-dlp: https://github.com/yt-dlp/yt-dlp/releases
- ffmpeg: https://ffmpeg.org/download.html

4. **Create shadcn/ui configuration files**

Create these manually (see [SHADCN_SETUP.md](./SHADCN_SETUP.md)):
- `packages/ui/components.json`
- `apps/desktop/components.json`

5. **Add UI components** (optional)

```bash
cd apps/desktop
npx shadcn@latest add button card input
```

### Quick Start

**Run the desktop app in development:**

```bash
pnpm dev:desktop
```

**Run the web app** (once set up):

```bash
pnpm dev:web
```

---

## 💻 Development

### Available Scripts

From the **root**:

```bash
# Development
pnpm dev:desktop          # Start Vault desktop app with hot reload
pnpm dev:web              # Start landing page (Next.js dev server)

# Build
pnpm build:desktop        # Build desktop app for production
pnpm build:web            # Build landing page for production

# Code Quality
pnpm format               # Format all code with Prettier
pnpm lint                 # Lint all workspaces
```

From **apps/desktop**:

```bash
pnpm dev                  # Development mode
pnpm build                # Build for production
pnpm build:win            # Build Windows installer (.exe)
pnpm build:mac            # Build macOS app (.dmg)
pnpm build:linux          # Build Linux package (.AppImage, .deb)
pnpm typecheck            # Run TypeScript checks
```

### Development Workflow

1. **Start the dev server**
   ```bash
   pnpm dev:desktop
   ```
   This opens Vault with hot reload enabled. Edit renderer code and see changes instantly.

2. **Add a download**
   - Paste a YouTube URL
   - Click "Probe Formats" to see available qualities
   - Select format and output path
   - Click "Download"
   - Watch real-time progress in the UI

3. **Add shared components**
   ```bash
   cd apps/desktop
   npx shadcn@latest add card input progress
   ```

4. **Use shared packages**
   ```typescript
   import { Button } from '@vault/ui/components/button'
   import type { Job, JobInput } from '@vault/types'
   import { APP_NAME, APP_VERSION } from '@vault/config'
   ```

5. **Format and lint**
   ```bash
   pnpm format
   pnpm lint
   ```

### Using the Download API

```typescript
import { useQueueDownload, useProbeFormats, useHistory } from '@/lib'

function DownloadManager() {
  const queue = useQueueDownload()
  const probe = useProbeFormats('https://youtube.com/watch?v=dQw4w9WgXcQ')
  const { data: history } = useHistory()

  const handleDownload = () => {
    queue.mutate({
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      outputTemplate: 'C:\\Downloads\\%(title)s.%(ext)s',
      formatSelector: 'bestvideo[height<=1080]+bestaudio/best',
      extra: {
        embedThumbnail: true,
        embedMetadata: true,
        embedSubs: false
      },
      meta: {
        title: 'My Video Title',
        channel: 'Channel Name'
      }
    })
  }

  return (
    <div>
      <button onClick={handleDownload} disabled={queue.isPending}>
        {queue.isPending ? 'Queuing...' : 'Download'}
      </button>
      {probe.data && (
        <select>
          {probe.data.formats.map(fmt => (
            <option key={fmt.format_id} value={fmt.format_id}>
              {fmt.format_note} - {fmt.ext}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
```

### Import Aliases

All apps have consistent import aliases:

```typescript
// Shared packages
import { Button } from '@vault/ui/components/button'
import type { Job } from '@vault/types'
import { APP_NAME } from '@vault/config'

// App-specific
import { useHistory } from '@/lib'           // lib/
import { Header } from '@/components'        // components/
import { QueryProvider } from '@/providers'  // providers/
```

---

## 🛠️ Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| [TypeScript](https://www.typescriptlang.org/) | 5.9 | Type-safe development |
| [React](https://react.dev/) | 19.2 | UI library |
| [Electron](https://www.electronjs.org/) | 39.2 | Desktop app framework |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Latest | Video downloading engine |
| [pnpm](https://pnpm.io/) | 8+ | Fast package manager |

### Desktop App Stack

| Technology | Purpose |
|------------|---------|
| [Electron Vite](https://electron-vite.org/) | Fast build tooling for Electron |
| [React Query](https://tanstack.com/query) | Server state management & caching |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Embedded SQLite database |
| [Sonner](https://sonner.emilkowal.ski/) | Beautiful toast notifications |
| [Lucide React](https://lucide.dev/) | Consistent icon library |
| [ffmpeg](https://ffmpeg.org/) | Video/audio processing |

### Styling Stack

| Technology | Purpose |
|------------|---------|
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS |
| [shadcn/ui](https://ui.shadcn.com/) | Component library |
| [class-variance-authority](https://cva.style/) | Variant management |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | Class merging |

### Build & Tooling

| Tool | Purpose |
|------|---------|
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [Electron Builder](https://www.electron.build/) | App packaging |
| [ESLint](https://eslint.org/) | Code linting |
| [Prettier](https://prettier.io/) | Code formatting |

---

## ✨ Features

### 📥 Download Management

- **Queue system** - Queue unlimited videos with configurable concurrency
- **Format selection** - Probe and select specific video/audio formats
- **Quality control** - Choose resolution, codec, bitrate
- **Custom output** - Full control over file naming and destination
- **Metadata embedding** - Automatically embed thumbnails and metadata
- **Worker pool** - Parallel downloads with resource management
- **Cancel/pause** - Full control over download lifecycle

### 📊 History & Organization

- **SQLite database** - Fast, local storage for download history
- **Rich metadata** - Title, channel, thumbnail, timestamps
- **Channel archiving** - Track which videos are downloaded per channel
- **Search & filter** - Find past downloads quickly
- **Format caching** - Cache format probes to speed up re-downloads

### 🎨 Modern UI/UX

- **Beautiful interface** - Clean, intuitive design with shadcn/ui
- **Light/dark themes** - Amber (light) and gold (dark) branding
- **Real-time progress** - Live progress bars and status updates
- **Toast notifications** - User-friendly success/error messages
- **Responsive design** - Works on any screen size
- **Keyboard shortcuts** - Power user productivity

### 🔧 Advanced Features

- **yt-dlp powered** - Best-in-class downloader engine
- **Platform support** - YouTube, Vimeo, Twitter, and 1000+ sites
- **Custom arguments** - Pass any yt-dlp flags you need
- **Error recovery** - Automatic retry with exponential backoff
- **Format probing** - See all available formats before downloading
- **Channel sync** - Download entire channels incrementally

---

## 🏗️ Architecture

---

## 📚 Documentation

Comprehensive guides are available in the repository:

| Document | Description |
|----------|-------------|
| [COMPLETE_SETUP_SUMMARY.md](./COMPLETE_SETUP_SUMMARY.md) | Complete setup overview |
| [WORKSPACE.md](./WORKSPACE.md) | Monorepo workspace guide |
| [STYLING.md](./STYLING.md) | Design system documentation |
| [SHADCN_SETUP.md](./SHADCN_SETUP.md) | shadcn/ui integration guide |
| [DATA_LAYER.md](./apps/desktop/DATA_LAYER.md) | React Query architecture |
| [ERROR_HANDLING.md](./apps/desktop/ERROR_HANDLING.md) | Error formatting guide |
| [SETUP_COMPLETE.md](./apps/desktop/SETUP_COMPLETE.md) | Data layer setup details |

### Quick Links

- **Getting Started**: See [Installation](#installation)
- **Adding Components**: See [SHADCN_SETUP.md](./SHADCN_SETUP.md)
- **Styling Guide**: See [STYLING.md](./STYLING.md)
- **Data Layer**: See [DATA_LAYER.md](./apps/desktop/DATA_LAYER.md)
- **Monorepo Usage**: See [WORKSPACE.md](./WORKSPACE.md)

---

## 🎯 Monorepo Benefits

### Why Monorepo?

✅ **Code Sharing**
- Share components, types, and utilities
- Single source of truth for design system
- Reuse business logic across apps

✅ **Consistent Dependencies**
- One `pnpm-lock.yaml` for entire project
- Shared dependencies installed once
- Reduced disk space and install time

✅ **Type Safety**
- Types flow across package boundaries
- Refactor with confidence
- IDE autocomplete across packages

✅ **Unified Tooling**
- Single ESLint, Prettier, TypeScript config
- Consistent code style
- Shared scripts and workflows

✅ **Atomic Changes**
- Change types, components, and apps together
- Single PR for cross-package features
- No version mismatches

✅ **Better Developer Experience**
- One `pnpm install` for everything
- Hot reload across packages
- Faster development cycles

### Workspace Structure

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"      # Applications (desktop, web)
  - "packages/*"  # Shared packages (ui, types, config)
```

### Package Linking

```json
{
  "dependencies": {
    "@vault/ui": "workspace:*",      // Links to local package
    "@vault/types": "workspace:*",
    "@vault/config": "workspace:*"
  }
}
```

Changes to `packages/ui` are **immediately** reflected in `apps/desktop`!

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/vault.git`
3. Create a branch: `git checkout -b feature/amazing-feature`
4. Install dependencies: `pnpm install`
5. Make your changes
6. Run tests: `pnpm test` (if available)
7. Format code: `pnpm format`
8. Commit: `git commit -m 'Add amazing feature'`
9. Push: `git push origin feature/amazing-feature`
10. Open a Pull Request

### Code Style

- **TypeScript**: Strict mode enabled
- **File naming**: kebab-case (`use-job-events.ts`, `query-provider.tsx`)
- **Components**: PascalCase function names
- **Imports**: Absolute imports with aliases
- **Formatting**: Prettier with 100-char line length
- **Linting**: ESLint with React + TypeScript rules

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new download feature
fix: resolve progress bar issue
docs: update README
style: format code
refactor: simplify error handler
test: add unit tests
chore: update dependencies
```

### Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Types are properly defined
- [ ] Comments explain complex logic
- [ ] No console errors or warnings
- [ ] Tested in development
- [ ] Documentation updated (if needed)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Built With

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The most powerful YouTube downloader
- [Electron](https://www.electronjs.org/) - Desktop app framework
- [React](https://react.dev/) - UI library
- [Tanstack Query](https://tanstack.com/query) - Server state management
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful component library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Fast SQLite bindings
- [pnpm](https://pnpm.io/) - Efficient package manager

### Inspired By

- [youtube-dl](https://youtube-dl.org/) - The original
- [Stacher](https://stacher.io/) - Desktop YouTube downloader
- [4K Video Downloader](https://www.4kdownload.com/) - Commercial alternative

---

## ⚖️ Legal & Disclaimer

**Vault is intended for personal use only.** Users are responsible for complying with:

- YouTube's Terms of Service
- Copyright laws in their jurisdiction
- Platform-specific content policies

**Use cases:**
- ✅ Downloading your own uploaded content
- ✅ Downloading Creative Commons licensed content
- ✅ Archiving educational or research materials within fair use
- ✅ Downloading content you have explicit permission to download

**Do NOT use Vault to:**
- ❌ Pirate copyrighted content
- ❌ Violate platform terms of service
- ❌ Distribute downloaded content without permission
- ❌ Circumvent DRM or access controls

The developers of Vault are not responsible for how you use this software.

---

## 📞 Support

- **Documentation**: Check the [docs](#documentation) section
- **Issues**: [GitHub Issues](https://github.com/yourusername/vault/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/vault/discussions)

---
