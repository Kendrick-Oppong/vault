# Vault Enhanced Download System - Merge Integration Guide

## Overview

This document describes the enhanced download system that has been integrated into Vault, incorporating robust patterns from reference repos (molexxxx's youtube-downloader and Shawshank01's yt-downloader-electron).

## New Files Created

### 1. **validators.ts** - URL and Input Validation
Validates YouTube URLs and download parameters before processing.

**Key Functions:**
- `validateYouTubeUrl()` - Validates YouTube URLs, extracts video IDs
- `isPlaylistUrl()` - Detects playlist URLs
- `validateOutputTemplate()` - Ensures output template has valid placeholders
- `validateFormatSelector()` - Validates format selector strings

**Impact:** Prevents invalid URLs and parameters from entering the queue, failing early with clear error messages.

### 2. **dependencies.ts** - Binary Dependency Checker
Ensures yt-dlp and ffmpeg are installed and accessible before downloads start.

**Key Functions:**
- `checkDependencies()` - Verifies both yt-dlp and ffmpeg
- `getDependencyErrorMessage()` - Provides user-friendly installation instructions
- `requireDependency()` - Throws if a specific dependency is missing

**Impact:** App detects missing dependencies at startup and provides clear installation guidance.

### 3. **ffmpeg-manager.ts** - FFmpeg Post-Processing
Handles video re-encoding, codec fallbacks, thumbnail extraction, and audio extraction.

**Key Features:**
- Codec detection and fallback support (H.264 → H.265 → VP9)
- Progress tracking with percentage calculation
- Audio extraction with quality control
- Subtitle handling and metadata preservation

**Impact:** Enables future re-encoding features without modifying core download logic.

### 4. **progress-tracker.ts** - Enhanced Progress Tracking
Calculates and normalizes progress data from yt-dlp output.

**Key Functions:**
- `track()` - Enriches progress with ETA, speed, percentage
- `formatSpeed()` - Human-readable speed (B/s → GB/s)
- `isStalled()` - Detects downloads that appear stuck
- `getAverageSpeed()` - Calculates average speed over time

**Metrics Provided:**
- `percentComplete` - 0-100 percentage
- `speedMbps` - Current speed in Mbps
- `etaSeconds` - Seconds remaining
- `formattedSpeed` - "12.5 MB/s" format
- `formattedEta` - "2m 30s" format

**Impact:** Renderer can display accurate progress, speed, and ETA to users.

## Enhanced Files

### 1. **ytdlp-manager.ts** - Improved Process Management
**Enhancements:**
- Added retry logic with exponential backoff (1s, 2s, 4s delays)
- URL validation before probing
- Timeout handling (30s default for probes)
- Better error message parsing for common yt-dlp errors
- Progress data normalization
- Graceful timeout handling

**New Methods:**
- `probFormatsInternal()` - Internal probe with timeout handling
- `normalizeProgress()` - Standardizes progress output
- `parseYtDlpError()` - User-friendly error messages

**Error Handling Examples:**
- "Video requires sign-in" instead of raw stderr
- "Access forbidden" for HTTP 403
- "Connection failed" for network issues

### 2. **worker-pool.ts** - Progress Tracking Integration
**Enhancements:**
- Integrated `ProgressTracker` for each active job
- Stall detection (logs warning after 15s inactivity)
- Progress enrichment before emitting to renderer
- Better error context in failure handlers

**New EventEmitter Flow:**
```
job:queued → job:started → job:progress (enriched) → job:completed/failed/cancelled
```

### 3. **index.ts** - Validation and Dependency Checks
**Enhancements:**
- New imports for validators, dependencies, FFmpeg manager
- Dependency check on app startup with logging
- URL/template/format validation on `queue:add`
- New IPC handler: `dependencies:check` for renderer to query status
- FfmpegManager initialization

**New IPC Handlers:**
```typescript
ipcMain.handle('dependencies:check', async () => {
  // Returns: { ready, ytDlp, ffmpeg, errors, errorMessage }
})
```

**Validation Pipeline:**
```
queue:add → validateYouTubeUrl → validateOutputTemplate → validateFormatSelector → enqueue
```

## Integration Points with Renderer

### New IPC Calls Available

1. **Check Dependencies Status:**
```typescript
const status = await ipcRenderer.invoke('dependencies:check');
if (!status.ready) {
  console.error(status.errorMessage); // Show installation instructions
}
```

2. **Enhanced Progress Events:**
```typescript
ipcRenderer.on('job:progress', (jobId, enrichedProgress) => {
  console.log(`Speed: ${enrichedProgress.formattedSpeed}`);
  console.log(`ETA: ${enrichedProgress.formattedEta}`);
  console.log(`Progress: ${enrichedProgress.percentComplete}%`);
});
```

3. **Existing Controls (now with better validation):**
```typescript
// These now validate inputs before processing
ipcRenderer.invoke('queue:add', jobInput); // Validates URL, template, format
ipcRenderer.invoke('queue:pause', jobId);
ipcRenderer.invoke('queue:resume', jobId);
ipcRenderer.invoke('queue:cancel', jobId);
```

## Error Handling Improvements

### Before (Original Implementation)
- Raw yt-dlp stderr messages
- No retry logic
- No validation before queuing
- Generic error messages

### After (Enhanced Implementation)
- User-friendly error messages mapped from yt-dlp output
- Automatic retry with exponential backoff
- Early validation prevents invalid jobs
- Specific error contexts:
  - "Video is age-restricted" 
  - "Format not available"
  - "Connection refused"
  - "Sign-in required"

## Performance Optimizations

1. **Validation** - Catches errors before spawning processes
2. **Retry Logic** - Recovers from transient network failures
3. **Progress Tracking** - Minimal overhead (JS-only calculations)
4. **Dependency Checking** - Once at startup, cached result
5. **Timeout Handling** - Prevents hung processes during probing

## Migration Notes for Renderer

The changes are **backward compatible**. Existing renderer code will continue to work. To take advantage of enhancements:

1. **Add dependency check on app startup:**
```typescript
const deps = await ipcRenderer.invoke('dependencies:check');
if (!deps.ready) {
  // Show error banner with installation instructions
  showError(deps.errorMessage);
}
```

2. **Display enriched progress:**
```typescript
ipcRenderer.on('job:progress', (jobId, progress) => {
  updateProgressBar(progress.percentComplete);
  updateSpeedDisplay(progress.formattedSpeed);
  updateEtaDisplay(progress.formattedEta);
});
```

3. **Handle validation errors gracefully:**
```typescript
try {
  const jobId = await ipcRenderer.invoke('queue:add', jobInput);
} catch (err) {
  if (err.message.includes('Invalid URL')) {
    showUserError('Please enter a valid YouTube URL');
  } else if (err.message.includes('Invalid format')) {
    showUserError('Invalid format selector');
  }
}
```

## Testing Checklist

- [ ] Dependencies check works (check yt-dlp and ffmpeg paths)
- [ ] URL validation catches invalid URLs
- [ ] Format validation catches invalid format selectors
- [ ] Progress events include speed and ETA
- [ ] Pause/resume/cancel still work correctly
- [ ] Retry logic recovers from transient failures
- [ ] Error messages are user-friendly
- [ ] No regression in existing download functionality
- [ ] Age-restricted videos work with cookies
- [ ] Playlist detection works

## Reference Implementation Details

### From molexxxx/youtube-downloader
- Structured progress parsing
- Error categorization
- Better codec handling

### From Shawshank01/yt-downloader-electron
- Pause/resume mechanism
- Download archiving
- FFmpeg integration patterns

## Future Enhancements

1. **Re-encoding Pipeline** - Use FfmpegManager for post-download conversion
2. **Rate Limiting** - Implement bandwidth throttling per job
3. **Archive Management** - Prevent duplicate downloads
4. **Subtitle Auto-Fetching** - Extract and embed subtitles
5. **Proxy Support** - Route downloads through configurable proxies
6. **Batch Processing** - Queue validation for entire playlists

## Troubleshooting

### "yt-dlp not found" Error
- Verify binary path in `resolveBinaryPaths()`
- Ensure yt-dlp is installed: `pnpm run download-binaries`
- Check file permissions

### "Format not available" Errors
- Format selector may not match available streams
- Try using format ID instead: `22` instead of `22+18`
- Enable format fallback in future versions

### Stalled Downloads
- Worker pool logs warnings after 15s inactivity
- Check network connectivity
- Verify video isn't private/age-restricted without cookies

### Progress Not Updating
- Ensure progress enrichment is enabled
- Check that yt-dlp is using `--progress` flag
- Verify stdout is not being buffered

## Support

For issues related to these enhancements:
1. Check console logs for `[yt-dlp]` and `[WorkerPool]` messages
2. Verify dependencies are installed and accessible
3. Run dependency check: `ipcRenderer.invoke('dependencies:check')`
4. Review error messages for specific guidance
