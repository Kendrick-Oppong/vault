# Download binaries for Vault Desktop App
# Run this script from the apps/desktop directory

Write-Host "Downloading yt-dlp and ffmpeg binaries..." -ForegroundColor Cyan

# Create directory
New-Item -ItemType Directory -Force -Path "bin\win32" | Out-Null

# Download yt-dlp
Write-Host "Downloading yt-dlp..." -ForegroundColor Yellow
curl.exe -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -o "bin\win32\yt-dlp.exe"
Write-Host "yt-dlp downloaded" -ForegroundColor Green

# Download ffmpeg
Write-Host "Downloading ffmpeg (this may take a minute)..." -ForegroundColor Yellow
curl.exe -L "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -o "ffmpeg-temp.zip"
Write-Host "ffmpeg downloaded" -ForegroundColor Green

# Extract ffmpeg
Write-Host "Extracting ffmpeg..." -ForegroundColor Yellow
Expand-Archive -Path "ffmpeg-temp.zip" -DestinationPath "." -Force

# Find and copy binaries
$ffmpegDir = Get-ChildItem -Directory -Filter "ffmpeg-*" | Select-Object -First 1
Copy-Item "$($ffmpegDir.FullName)\bin\ffmpeg.exe" "bin\win32\ffmpeg.exe"
Copy-Item "$($ffmpegDir.FullName)\bin\ffprobe.exe" "bin\win32\ffprobe.exe"
Write-Host "ffmpeg and ffprobe copied" -ForegroundColor Green

# Clean up
Write-Host "Cleaning up..." -ForegroundColor Yellow
Remove-Item "ffmpeg-temp.zip" -Force
Remove-Item $ffmpegDir.FullName -Recurse -Force
Write-Host "Cleanup complete" -ForegroundColor Green

Write-Host ""
Write-Host "All binaries downloaded successfully!" -ForegroundColor Green
Write-Host "Location: bin/win32/" -ForegroundColor Cyan
Write-Host "  - yt-dlp.exe" -ForegroundColor White
Write-Host "  - ffmpeg.exe" -ForegroundColor White
Write-Host "  - ffprobe.exe" -ForegroundColor White
Write-Host ""
