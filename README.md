# Vault

> Desktop YouTube downloader for macOS, Windows, and Linux — powered by yt-dlp.

Vault is an Electron + React app that downloads video and audio from YouTube and 1000+ sites, entirely on your machine.

## Features

- Concurrent download queue with pause, resume, retry, and cancel
- One-click presets (Best / 1080p / 720p / Audio MP3 / Audio FLAC) or manual format selection
- In-app YouTube search and playlist support
- Browser-cookie import for gated content
- SQLite-backed history with search, filters, and bulk actions
- Auto-downloads yt-dlp and ffmpeg on first run
- Light/dark themes and in-app auto-update

## Getting Started

```bash
git clone https://github.com/Kendrick-Oppong/vault.git
cd vault
pnpm install
pnpm dev:desktop
```

Requires Node.js (see [`.nvmrc`](./.nvmrc)) and pnpm 8+. yt-dlp and ffmpeg are fetched automatically on first launch.

## Scripts

```bash
pnpm dev:desktop      # run the desktop app with hot reload
pnpm build:desktop    # build the desktop app
pnpm lint             # lint all workspaces
pnpm format           # format with Prettier
```

## Project Structure

```
apps/desktop     Electron app (main / preload / renderer)
apps/web         Landing page (Next.js)
packages/ui      Shared UI components
packages/types   Shared TypeScript types
packages/config  Shared constants
```

## License

MIT — see [LICENSE](LICENSE).
