# Releasing & Auto-Update

Vault ships auto-updates via [`electron-updater`](https://www.electron.build/auto-update),
reading its release feed from **GitHub Releases**. Installed apps check for updates
on launch (and from **Settings → Check for updates**), download in the background,
and prompt the user to restart when a new version is ready.

## How it works

1. Push a `v*` tag → `.github/workflows/release.yml` runs on macOS, Windows, and Linux.
2. Each runner builds its installer with `electron-builder` and publishes the artifacts
   **plus** the update metadata (`latest.yml`, `latest-mac.yml`, `latest-linux.yml`) to
   the GitHub Release for that tag (`publish: provider: github` in
   `apps/desktop/electron-builder.yml`).
3. The running app compares its version against the feed and updates itself.

## Cutting a release

```bash
# 1. Decide the new version (e.g. 0.2.0) and tag it.
git tag v0.2.0
git push origin v0.2.0
```

The workflow sets `apps/desktop/package.json` `version` from the tag, so the tag is the
single source of truth — no manual version bump needed. A draft/published GitHub Release
is created automatically with all installers attached.

You can also trigger the workflow manually from the Actions tab (**workflow_dispatch**)
for a test build.

## Code signing (required for macOS updates)

electron-updater **cannot install updates on macOS unless the build is signed and
notarized**. Windows updates work unsigned but show SmartScreen warnings, so signing is
recommended there too.

**Current state:** no signing secrets are set, so all three platforms build **unsigned**.
Windows and Linux still auto-update normally; macOS installers are published but **Mac
clients will not auto-update** until the Apple secrets below are added (requires the paid
Apple Developer Program, $99/yr).

Add these as **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Platform | Purpose |
| --- | --- | --- |
| `CSC_LINK` | macOS | Base64 of the Developer ID Application `.p12` |
| `CSC_KEY_PASSWORD` | macOS | Password for that `.p12` |
| `APPLE_ID` | macOS | Apple ID email for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | macOS | App-specific password for that Apple ID |
| `APPLE_TEAM_ID` | macOS | Apple Developer Team ID |
| `WIN_CSC_LINK` | Windows | Base64 of the Authenticode `.pfx` |
| `WIN_CSC_KEY_PASSWORD` | Windows | Password for that `.pfx` |

To enable notarization once the Apple secrets are in place, set `mac.notarize: true` in
`apps/desktop/electron-builder.yml`.

The `GITHUB_TOKEN` used for publishing is provided automatically by Actions — no setup
needed.

## Local testing

`apps/desktop/dev-app-update.yml` points the updater at the same GitHub feed so you can
test update detection from a dev build against a real published release.
