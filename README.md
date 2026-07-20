<div align="center">

# 🗄️ Vault

**A fast, modern desktop YouTube downloader — powered by yt-dlp & FFmpeg**

Download videos, playlists, and audio from YouTube and 1000+ sites, entirely on your machine.

[Features](#-features) · [Screenshots](#-screenshots) · [Quick Start](#-quick-start) · [Tech Stack](#-tech-stack) · [Project Structure](#-project-structure)

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=black)
![Electron](https://img.shields.io/badge/Electron-39-47848f.svg?logo=electron&logoColor=white)
![yt-dlp](https://img.shields.io/badge/yt--dlp-powered-red.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green.svg)

</div>

---

## 📸 Screenshots

<div align="center">

<a href="queue.png"><img src="queue.png" alt="Queue view with live download progress" width="860"></a>

<sub><b>Queue</b> — paste a link or search, then track live progress across the download queue</sub>

<br/><br/>

<a href="format-modal.png"><img src="format-modal.png" alt="Format modal with presets and post-processing" width="860"></a>

<sub><b>Format modal</b> — one-click presets, container choice, and post-processing options</sub>

</div>

---

## ✨ Features

### Download & Formats

- **Paste or search** — drop a YouTube link _or_ search by keyword right from the URL bar
- **Videos, playlists & audio** — download single videos, whole playlists (with a configurable fetch limit), or extract audio
- **Quick presets** — one click for **Best**, **1080p**, **720p**, **Audio MP3**, or **Audio FLAC**
- **Manual control** — hand-pick a specific format, container (**MP4 / MKV**), audio codec, and bitrate

### Queue & History

- **Concurrent queue** — configurable parallel downloads with pause, resume, retry, and cancel (single or bulk)
- **Real-time progress** — live speed, ETA, and status for every job
- **History** — SQLite-backed history with search, filters, bulk actions, and missing-file detection
- **Download archive** — skip already-downloaded items on re-runs, with an overwrite prompt when files exist

### Post-Processing & Access

- **Embed** thumbnails, metadata, and chapters into output files
- **Subtitles** and **SponsorBlock** segment removal
- **Browser cookies** — import cookies from your installed browser for age-gated, private, or members-only content

### Experience

- **Zero setup** — yt-dlp and FFmpeg are **auto-downloaded** on first run for your platform
- **Polished UI** — frameless custom titlebar, light/dark themes, command palette, and first-run onboarding
- **Self-updating** — built-in in-app auto-update

---

## 🚀 Quick Start

```bash
git clone https://github.com/Kendrick-Oppong/vault.git
cd vault
pnpm install
pnpm dev:desktop
```

> Requires **Node.js** (see [`.nvmrc`](./.nvmrc)) and **pnpm 8+**. yt-dlp and FFmpeg are fetched automatically on first launch.

**Common scripts**

```bash
pnpm dev:desktop      # run the desktop app with hot reload
pnpm build:desktop    # build the desktop app
pnpm lint             # lint all workspaces
pnpm format           # format with Prettier
```

---

## 🧩 Tech Stack

**Electron** · **React 19** · **TypeScript** · **Tailwind CSS v4** + **shadcn/ui** · **TanStack Query** · **Zustand** · **better-sqlite3** · **yt-dlp** + **FFmpeg** · **pnpm** workspaces

---

## 📁 Project Structure

```
apps/desktop     Electron app (main / preload / renderer)
apps/web         Landing page (Next.js)
packages/ui      Shared UI components
packages/types   Shared TypeScript types
packages/config  Shared constants
```

---

## 📄 License

MIT — see [LICENSE](LICENSE).
