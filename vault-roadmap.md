# Vault — Feature Roadmap

Complete feature list, organized into phases you can build and check off in order. Each phase produces a working, testable increment — you shouldn't need to jump ahead to make a phase useful.

**Status legend:** ✅ done · 🟡 scaffolded (needs wiring/testing) · ⬜ not started

---

## Phase 0 — Foundation

Infrastructure that everything else depends on.

- [x] ✅ Monorepo structure (`apps/desktop`, `apps/web`, `packages/*`) — pnpm workspaces
- [x] ✅ electron-vite scaffold (`react-ts` template)
- [x] ✅ Main process: window creation, IPC handler map (`src/main/index.ts`)
- [x] ✅ Preload bridge, context-isolated (`src/preload/index.ts`)
- [x] ✅ `YtDlpManager` — spawns yt-dlp binary directly, parses `--progress-template` JSON
- [x] ✅ `WorkerPool` — bounded-concurrency download queue
- [x] ✅ SQLite layer (`db.ts`) — history, download-archive dedup, format cache
- [ ] ⬜ Bundle yt-dlp + ffmpeg binaries per-platform (`bin/win32/`, extraResources in `electron-builder.yml`)
- [ ] ⬜ Verify `better-sqlite3` native module builds correctly via `electron-rebuild`
- [x] ✅ Full UI/UX design reference (HTML prototype, all screens + states)

---

## Phase 1 — Core MVP

The smallest version that's actually useful: paste a link, download a video.

- [x] ✅ React app shell (titlebar, sidebar, Queue view) built from the HTML prototype
- [x] ✅ Smart URL input with paste-and-detect (video/playlist/channel)
- [x] ✅ Format Selection Matrix — video resolutions, fps, container
- [x] ✅ Add-to-queue → real IPC call → real yt-dlp download
- [x] ✅ Live progress dashboard (speed, ETA, size, %) wired to real `job:progress` events
- [ ] 🟡 Pause / resume / cancel a single download
- [x] ✅ Basic Settings: default destination folder, concurrency
- [x] ✅ Light/dark theme toggle (functional, not just visual)

**Done when:** you can paste a real YouTube link, pick a resolution, and get a working MP4 on disk.

---

## Phase 2 — Audio & Library

- [x] ✅ Audio-only extraction (FLAC/WAV/MP3/AAC/OPUS) in the Format Matrix
- [x] ✅ Library view — reads completed downloads from SQLite
- [ ] 🟡 Mini player modal (`<video>`/`<audio>` playback) — UI has play button, no actual player yet
- [x] ✅ Open in File Explorer
- [ ] 🟡 Delete from library (with confirm) — UI + confirmation dialog wired, delete action is mocked
- [x] ✅ Library search + sort (recent/title/size)

**Done when:** completed downloads show up in Library and are playable/manageable without leaving the app.

---

## Phase 3 — Playlists & Channels

- [x] ✅ Playlist detection + checkbox selector (select all/none, per-item)
- [ ] ⬜ Auto-numbered filenames (`01 - Title.mp4`) + auto-created playlist folder
- [ ] ⬜ Channel Sync view — add channel, destination folder
- [ ] ⬜ "Sync now" — probes channel, cross-references `download-archive` table, queues only new videos
- [ ] ⬜ Channel search/filter (once list grows)
- [ ] 🟡 Reset download archive (Settings → Danger zone) — UI exists, action is a stub (toast only)

**Done when:** you can sync a whole channel and re-sync later without re-downloading anything.

---

## Phase 4 — Metadata & Post-Processing

- [x] ✅ Embed thumbnail as cover art
- [x] ✅ Embed metadata (artist, title, description, upload date, chapters)
- [x] ✅ Subtitles — external `.srt`/`.vtt` or burned-in
- [x] ✅ Per-download post-processing overrides (vs. global defaults in Settings)

**Done when:** downloaded files look and behave like they came from a professional media library, not a raw scrape.

---

## Phase 5 — Resilience & Networking

The stuff that makes it not break the moment YouTube changes something.

- [ ] ⬜ Retries on network interruption (`--retries 10 --fragment-retries 10`)
- [ ] ⬜ Player-client fallback chain (web → android → ios) on extraction failure
- [ ] ⬜ yt-dlp self-update on signature/decipher errors, with retry cap
- [ ] 🟡 Cookies-from-browser auth (Chrome/Firefox/Edge/Safari) for private/age-restricted content — Settings UI + ytdlp support exist, not wired into download flow
- [ ] 🟡 Bandwidth rate limiting — Settings UI + ytdlp `--limit-rate` support exist, not wired
- [ ] 🟡 Proxy support + inline validation (`host:port` format) — Settings UI + ytdlp `--proxy` support exist, not wired
- [ ] 🟡 Geo-bypass toggle — Settings UI toggle + ytdlp `--geo-bypass` support exist, not wired
- [ ] ⬜ Offline detection — pause active downloads, show banner, auto-resume on reconnect
- [ ] ⬜ Low-disk-space detection — banner + distinct "paused: disk full" job state
- [ ] ⬜ Duplicate-link detection (warn before re-downloading something already in library)
- [x] ✅ Expandable error detail on failed downloads (stderr, retry chain shown)

**Done when:** you can leave it running unattended overnight syncing multiple channels and trust it not to silently fail.

---

## Phase 6 — Power-User UX

- [x] ✅ Command palette (⌘K) — navigate, toggle theme, focus input
- [ ] 🟡 Keyboard shortcuts (`1`–`4` switch views, `/` focus input, `?` shortcuts help) — ⌘K and `/` work; `1`–`4` view switching and `?` help not yet added
- [x] ✅ Right-click context menus (Queue/Library/Channel cards)
- [ ] 🟡 Bulk select mode in Queue (multi pause/resume/retry/remove) — UI exists, actions are stubs
- [ ] ⬜ Multi-link paste (bulk-add modal with per-link include/exclude)
- [ ] ⬜ Drag-and-drop links onto the window

**Done when:** a power user managing 50+ queued items doesn't feel throttled by the UI.

---

## Phase 7 — App Lifecycle

- [ ] ⬜ First-run onboarding (welcome + destination folder/concurrency setup, skippable)
- [ ] 🟡 Minimize-to-tray toggle + tray icon with context menu (Show/Pause all/Quit) — Settings toggle exists, no tray implementation in main process yet
- [ ] ⬜ Quit-with-active-downloads confirmation
- [ ] ⬜ Window state persistence (remember size/position across launches — `electron-store` or similar)
- [ ] ⬜ App auto-update via `electron-updater` (distinct from yt-dlp self-update), with restart banner
- [ ] ⬜ OS-native notifications (download complete, while minimized/backgrounded)

**Done when:** it behaves like a real installed app, not a script with a window.

---

## Phase 8 — Polish & Distribution

- [ ] ⬜ Light-mode visual QA pass (built dark-first — needs a dedicated look)
- [ ] ⬜ Accessibility pass (screen reader labels, keyboard nav audit, contrast check)
- [ ] ⬜ App icon set (.ico for Windows, .icns for Mac) from the Vault mark
- [ ] ⬜ Large-queue performance check (50+ items — confirm React reconciliation handles it without the DOM-thrash issues the static prototype had)
- [ ] ⬜ `electron-builder` production config — code signing, installer, auto-update feed
- [ ] ⬜ Next.js landing page (`apps/web`) — currently just scaffolded, no content

**Done when:** you'd hand this to someone else to install without embarrassment.

---

## Explicitly out of scope for now

Noting these so they don't get lost, not because they're unimportant:

- Localization / multi-language UI
- Cross-device sync of library/history
- Mobile companion app
- Scheduled/automatic channel sync (currently manual "Sync now" only)

---

## How to use this doc

Work top to bottom — each phase is a real milestone, not an arbitrary grouping. Phases 0–2 get you a genuinely useful daily-driver app. Phases 3–5 make it powerful and trustworthy. Phases 6–8 make it feel like a finished product. Check items off as you go; this file is meant to be edited, not just read.
