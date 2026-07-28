; Custom NSIS script for Vault Windows installer
; This script adds cleanup of user data on uninstall

!macro customUnInstall
  ; Clean up binaries directory
  Delete "$APPDATA\Vault\bin\*.*"
  RMDir "$APPDATA\Vault\bin"

  ; Clean up database files
  Delete "$APPDATA\Vault\*.db"
  Delete "$APPDATA\Vault\*.db-shm"
  Delete "$APPDATA\Vault\*.db-wal"

  ; Clean up log files
  Delete "$APPDATA\Vault\*.log"

  ; Clean up any remaining files
  Delete "$APPDATA\Vault\*.*"

  ; Remove directory if empty
  RMDir "$APPDATA\Vault"

  ; Clean up cache directory
  Delete "$LOCALAPPDATA\Vault-cache\*.*"
  RMDir "$LOCALAPPDATA\Vault-cache"
!macroend
