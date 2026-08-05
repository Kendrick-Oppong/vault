; Custom NSIS script for Vault Windows installer
; This script adds cleanup of user data on uninstall

!macro customUnInstall
  ; Recursively remove the entire AppData folder for Vault
  ; This ensures all databases, binaries, logs, and Electron storage (Cache, Local Storage, etc.) are completely wiped.
  RMDir /r "$APPDATA\Vault"

  ; Clean up Local AppData caches and electron-updater artifacts
  RMDir /r "$LOCALAPPDATA\Vault"
  RMDir /r "$LOCALAPPDATA\Vault-updater"
  RMDir /r "$LOCALAPPDATA\vault-updater"
!macroend
