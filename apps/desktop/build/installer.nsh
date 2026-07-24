; Custom NSIS script for Vault Windows installer
; This script adds cleanup of user data on uninstall

!macro customUnInstall
  ; Clean up user data directory
  Delete "$APPDATA\Vault\*.db"
  Delete "$APPDATA\Vault\*.db-shm"
  Delete "$APPDATA\Vault\*.db-wal"
  Delete "$APPDATA\Vault\*.log"
  Delete "$APPDATA\Vault\*.*"
  RMDir "$APPDATA\Vault"
  
  ; Clean up cache directory
  Delete "$LOCALAPPDATA\Vault-cache\*.*"
  RMDir "$LOCALAPPDATA\Vault-cache"
!macroend
