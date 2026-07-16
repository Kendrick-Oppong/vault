# Issues Fixed and Remaining Work

## Fixed Issues

### 1. AlertBanners Not Wired to Store ✅
- Created `system-alerts.store.ts` with state for offline, lowDisk, updateAvailable, diskSpaceFree
- Created `system-alerts.selectors.ts` with proper hooks
- Updated `App.tsx` to use system alerts store
- AlertBanners now pulls real state from store instead of hardcoded values

### 2. Output Template Validation Error ✅
- Fixed in `link-input.tsx`: now generates proper template from destination path
- If no template placeholders found, generates default: `destination/%(title)s.%(ext)s`
- Prevents "Output template must contain %(title)s or %(id)s" error

### 3. Storage Indicator Hardcoded ✅
- Created `storage-indicator.tsx` component that reads diskSpaceFree from system-alerts store
- Shows disk space with visual progress bar
- Color changes to red when space is low (< 2GB)
- Ready to be added to UI

### 4. Onboarding Screen ✅
- Created `onboarding.store.ts` with setup steps and progress tracking
- Created `onboarding-screen.tsx` UI matching screenshot provided
- Shows yt-dlp and ffmpeg download progress
- Integrated into App component - shows on first startup
- Will be dismissed once completed: true in store

### 5. Logs Viewer ✅
- Created `logs.store.ts` with log entry tracking (max 1000 entries)
- Created `logs-modal.tsx` with filtering and export functionality
- Can filter by info/warn/error/debug levels
- Export logs to text file with timestamp
- Clear logs button included

## Remaining Work (Prioritized)

### High Priority
1. **Custom Titlebar** - Electron doesn't render native titlebar, need custom React component
2. **Tray Integration** - Show app in system tray with quick actions
3. **Theme Toggle UI** - Add to settings to switch dark/light/system
4. **Desktop Notifications** - Wire up notifications for download completion/errors
5. **Quick Actions Window** - Always-on-top companion window

### Medium Priority
6. Settings UI organization with tabs
7. Download history with search/filter
8. Auto-update checker
9. Export/Import settings
10. Thumbnail cache management

### Low Priority  
11. Search suggestions
12. Keyboard shortcuts customization
13. Performance monitoring
14. Analytics integration

## Architecture Changes Made

All new stores follow the pattern:
- Store file: `stores/feature/feature.store.ts`
- Selectors file: `stores/feature/feature.selectors.ts`
- Uses Zustand with useShallow optimization
- No prop drilling - all via selectors
- Persistence where needed (onboarding, logs in memory)

## Key Files Modified

1. `/stores/system-alerts/` - NEW system alerts store
2. `/stores/onboarding/` - NEW onboarding store
3. `/stores/logs/` - NEW logs store
4. `/features/onboarding/` - NEW onboarding UI
5. `/features/modals/logs-modal/` - NEW logs viewer
6. `/features/ui/components/storage-indicator.tsx` - NEW storage indicator
7. `App.tsx` - Integrated onboarding and alerts
8. `link-input.tsx` - Fixed output template generation

## Next Steps

1. Add theme toggle UI component to settings
2. Create custom titlebar component
3. Implement desktop notifications system
4. Add tray integration for quick actions
5. Test all alert scenarios
