; Custom NSIS script for Vault Windows installer
;
; IMPORTANT: This macro runs during BOTH manual uninstall AND auto-update.
; During auto-updates, electron-updater invokes the old uninstaller silently (/S).
; We use IfSilent to detect this and NEVER wipe user data during updates.
; During manual (interactive) uninstalls, we ask the user.

!macro customUnInstall
  ; ── Always safe to delete: Electron runtime caches (regenerated on launch) ──
  RMDir /r "$APPDATA\Vault\Cache"
  RMDir /r "$APPDATA\Vault\Code Cache"
  RMDir /r "$APPDATA\Vault\GPUCache"
  RMDir /r "$APPDATA\Vault\DawnCache"
  RMDir /r "$APPDATA\Vault\blob_storage"
  RMDir /r "$APPDATA\Vault\Service Worker"
  RMDir /r "$APPDATA\Vault\DawnWebCache"

  ; ── Always safe: electron-updater leftovers ──
  RMDir /r "$LOCALAPPDATA\Vault-updater"
  RMDir /r "$LOCALAPPDATA\vault-updater"

  ; ── Conditional full wipe ──
  ; IfSilent → auto-update is running the uninstaller in the background.
  ;            Skip the prompt and preserve everything.
  ; If not silent → user manually launched the uninstaller. Ask them.
  IfSilent skipWipe 0
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "Also delete all user data?$\n$\nThis includes download history, settings, and downloaded binaries (yt-dlp, ffmpeg).$\n$\nChoose 'No' to keep your data." \
      IDYES doWipe IDNO skipWipe

    doWipe:
      RMDir /r "$APPDATA\Vault"
      RMDir /r "$LOCALAPPDATA\Vault"

  skipWipe:
!macroend
