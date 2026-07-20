import { useState } from "react";
import { Button } from "@vault/ui/components/button";
import { Input } from "@vault/ui/components/input";
import { Switch } from "@vault/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@vault/ui/components/select";
import {
  Download,
  Palette,
  FileText,
  Globe,
  KeyRound,
  Info,
  ShieldAlert,
  RefreshCw,
  Minus,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FolderOpen
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings, useSettingsActions } from "@/stores/settings/settings.selectors";
import { useSetConcurrency } from "@/lib/mutations/downloads";
import { useUIState } from "@/stores/ui/ui.selectors";
import { useCookieInfo } from "@/lib/queries/cookies";
import { useSetCookieBrowser, useRefreshCookies, useClearCookies } from "@/lib/mutations/cookies";
import { useClearDownloadArchive } from "@/lib/mutations/cache";
import { useCheckForUpdates } from "@/lib/queries/app";
import { useOpenFolderDialog } from "@/lib/mutations/files";
import { useDependenciesCheck } from "@/lib/queries/dependencies";
import { cn } from "@vault/ui/lib/utils";
import { useModalActions } from "@/stores/ui/modal.selectors";

export const SettingsView = () => {
  const settings = useSettingsStore(selectSettings);
  const { updateSetting } = useSettingsActions();
  const { theme, setTheme } = useUIState();
  const [bandwidthError, setBandwidthError] = useState(false);
  const [proxyError, setProxyError] = useState(false);
  const { mutate: setConcurrency } = useSetConcurrency();
  const { openConfirmDialog } = useModalActions();

  const handleSetBrowser = (value: string | null) => {
    const browserValue = value === "none" || !value ? "" : value;
    setBrowserMutation.mutate(browserValue);
  };

  const { data: cookieInfo } = useCookieInfo();
  const setBrowserMutation = useSetCookieBrowser();
  const refreshMutation = useRefreshCookies();
  const clearMutation = useClearCookies();
  const checkUpdatesMutation = useCheckForUpdates();
  const openFolderMutation = useOpenFolderDialog();
  const clearDownloadArchiveMutation = useClearDownloadArchive();
  const { data: deps, isLoading: depsLoading } = useDependenciesCheck();

  const handleConcurrentChange = (delta: number) => {
    const newValue = Math.max(1, Math.min(10, settings.concurrentDownloads + delta));
    updateSetting("concurrentDownloads", newValue);
    setConcurrency(newValue);
  };

  const handleBandwidthChange = (value: string) => {
    updateSetting("bandwidthLimit", value);
    setBandwidthError(Boolean(value && !/^\d+[KM]$/i.test(value)));
  };

  const handleProxyChange = (value: string) => {
    updateSetting("proxy", value);
    setProxyError(Boolean(value && !/^.+:\d+$/.test(value)));
  };

  const formatCookieAge = (ms: number | null): string => {
    if (ms == null) return "never";
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="py-5">
      <div className="space-y-6">
        {/* Downloads */}
        <Section icon={<Download className="w-3.5 h-3.5" />} title="Downloads">
          <Row label="Download folder" description="Where downloaded files are saved">
            <div className="flex items-center gap-2 min-w-0 flex-1 max-w-xs">
              <Input
                value={settings.downloadPath}
                onChange={(e) => updateSetting("downloadPath", e.target.value)}
                readOnly
                disabled
                placeholder="~/Downloads"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  openFolderMutation.mutate(undefined, {
                    onSuccess: (folder) => {
                      if (folder) updateSetting("downloadPath", folder);
                    }
                  })
                }
                disabled={openFolderMutation.isPending}
                title="Browse…"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Row>

          <Row
            label="Output template"
            description="yt-dlp filename template, e.g. %(title)s.%(ext)s"
          >
            <Input
              value={settings.outputTemplate}
              onChange={(e) => updateSetting("outputTemplate", e.target.value)}
              placeholder="%(title)s.%(ext)s"
              className="max-w-xs"
            />
          </Row>

          <Row
            label="Playlist fetch limit"
            description="Max items fetched from a playlist. 0 = no limit."
          >
            <Input
              type="number"
              min={0}
              max={5000}
              value={settings.playlistFetchLimit}
              onChange={(e) =>
                updateSetting(
                  "playlistFetchLimit",
                  Math.max(0, Math.floor(Number(e.target.value) || 0))
                )
              }
              className="max-w-30"
            />
          </Row>

          <Row label="Concurrent downloads" description="Max simultaneous downloads">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleConcurrentChange(-1)}
                disabled={settings.concurrentDownloads <= 1}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-6 text-center font-medium tabular-nums">
                {settings.concurrentDownloads}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleConcurrentChange(1)}
                disabled={settings.concurrentDownloads >= 10}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </Row>
        </Section>

        {/* Metadata */}
        <Section icon={<FileText className="w-3.5 h-3.5" />} title="Metadata">
          <Row label="Embed thumbnail" description="Default setting for new downloads">
            <Switch
              checked={settings.embedThumbnail}
              onCheckedChange={(checked) => updateSetting("embedThumbnail", checked)}
            />
          </Row>

          <Row
            label="Embed metadata"
            description="Write title, channel, and date tags into the file"
          >
            <Switch
              checked={settings.embedMetadata}
              onCheckedChange={(checked) => updateSetting("embedMetadata", checked)}
            />
          </Row>

          <Row label="Embed chapters" description="Include YouTube chapter markers when available">
            <Switch
              checked={settings.embedChapters}
              onCheckedChange={(checked) => updateSetting("embedChapters", checked)}
            />
          </Row>

          <Row
            label="Write subtitles"
            description="Download available subtitles alongside the video"
          >
            <Switch
              checked={settings.writeSubtitles}
              onCheckedChange={(checked) => updateSetting("writeSubtitles", checked)}
            />
          </Row>

          {settings.writeSubtitles && (
            <Row
              label="Subtitle languages"
              description="Comma-separated language codes, e.g. en,zh-Hans"
            >
              <Input
                value={settings.subtitleLangs.join(",")}
                onChange={(e) =>
                  updateSetting(
                    "subtitleLangs",
                    e.target.value
                      .split(",")
                      .map((l) => l.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="en, zh, fr"
                className="max-w-xs"
              />
            </Row>
          )}

          <Row
            label="Remove sponsored segments"
            description="Automatically cut sponsor, intro, and outro segments (SponsorBlock)"
          >
            <Switch
              checked={settings.sponsorBlock}
              onCheckedChange={(checked) => updateSetting("sponsorBlock", checked)}
            />
          </Row>

          <Row
            label="Download archive"
            description="Skip already downloaded files by keeping a record"
          >
            <Switch
              checked={settings.useDownloadArchive}
              onCheckedChange={(checked) => updateSetting("useDownloadArchive", checked)}
            />
          </Row>

          <Row
            label="Default container"
            description="Video downloads always include the best available audio, merged in automatically"
          >
            <Select
              value={settings.videoContainer}
              onValueChange={(value) => updateSetting("videoContainer", value as "mp4" | "mkv")}
            >
              <SelectTrigger className="h-8 w-24 text-[12px]">
                <SelectValue placeholder="MP4" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4</SelectItem>
                <SelectItem value="mkv">MKV</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </Section>

        {/* Appearance */}
        <Section icon={<Palette className="w-3.5 h-3.5" />} title="Appearance">
          <Row label="Theme">
            <Select
              value={theme}
              onValueChange={(value) => setTheme(value as "dark" | "light" | "system")}
            >
              <SelectTrigger className="h-8 w-32 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </Row>

          <Row
            label="Minimize to tray"
            description="Keep Vault running in the system tray when closed"
          >
            <Switch
              checked={settings.minimizeToTray}
              onCheckedChange={(checked) => updateSetting("minimizeToTray", checked)}
            />
          </Row>
        </Section>

        {/* Network */}
        <Section icon={<Globe className="w-3.5 h-3.5" />} title="Network">
          <Row
            label="Bandwidth limit"
            description={
              <>
                Cap download speed, e.g. <code>5M</code> or <code>500K</code>
              </>
            }
          >
            <div>
              <Input
                value={settings.bandwidthLimit}
                onChange={(e) => handleBandwidthChange(e.target.value)}
                className={`text-right ${bandwidthError ? "border-destructive" : ""}`}
                placeholder="unlimited"
              />
              {bandwidthError && (
                <p className="text-[11px] text-destructive mt-0.5">Format: 5M or 500K</p>
              )}
            </div>
          </Row>

          <Row
            label="Proxy"
            description={
              <>
                SOCKS5/HTTP proxy, e.g. <code>127.0.0.1:1080</code>
              </>
            }
          >
            <div>
              <Input
                value={settings.proxy}
                onChange={(e) => handleProxyChange(e.target.value)}
                className={proxyError ? "border-destructive" : ""}
                placeholder="host:port"
              />
              {proxyError && (
                <p className="text-[11px] text-destructive mt-0.5">Format: host:port</p>
              )}
            </div>
          </Row>

          <Row label="Geo-bypass" description="Try to bypass region-locked content">
            <Switch
              checked={settings.geoBypass}
              onCheckedChange={(checked) => updateSetting("geoBypass", checked)}
            />
          </Row>
        </Section>

        {/* Authentication */}
        <Section icon={<KeyRound className="w-3.5 h-3.5" />} title="Authentication">
          <Row
            label="Cookies browser"
            description="Extract cookies from your browser to authenticate downloads"
          >
            <div className="flex items-center gap-2">
              <Select
                value={settings.cookiesFromBrowser ?? "none"}
                onValueChange={(value) => handleSetBrowser(value)}
              >
                <SelectTrigger className="h-8 w-40 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  {cookieInfo?.detected?.map((browser) => (
                    <SelectItem key={browser.name} value={browser.name}>
                      {browser.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {settings.cookiesFromBrowser && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => refreshMutation.mutate(settings.cookiesFromBrowser)}
                    disabled={refreshMutation.isPending}
                    title="Refresh cookies"
                  >
                    {refreshMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => clearMutation.mutate(settings.cookiesFromBrowser)}
                    disabled={clearMutation.isPending}
                    title="Clear cookies"
                  >
                    {clearMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </Row>

          {cookieInfo?.effectiveBrowser && (
            <>
              <div className="py-2 flex items-center gap-2 text-[11.5px]">
                {cookieInfo.cached ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span className="text-muted-foreground">
                  {cookieInfo.cached
                    ? `Cached from ${cookieInfo.effectiveLabel} · ${formatCookieAge(cookieInfo.ageMs)}`
                    : `Could not extract cookies from ${cookieInfo.effectiveLabel}`}
                </span>
              </div>

              {!cookieInfo.cached && (
                <div className="py-2 text-[11.5px] text-muted-foreground">
                  Tip: Close {cookieInfo.effectiveLabel || "your browser"} completely before
                  refreshing - a running browser locks its cookie database and the import will fail.
                </div>
              )}

              {cookieInfo.detected.length === 0 && (
                <div className="py-2 text-[11.5px] text-muted-foreground">
                  No supported browsers detected on this machine, so cookies can&apos;t be imported.
                </div>
              )}
            </>
          )}
        </Section>

        {/* About & Dependencies */}
        <Section icon={<Info className="w-3.5 h-3.5" />} title="About & Dependencies">
          <Row label="Vault">
            <span className="text-muted-foreground text-[12px]">{settings.version}</span>
          </Row>

          <Row label="yt-dlp">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[12px]">
                {depsLoading ? "checking…" : (deps?.ytDlp.version ?? "not found")}
              </span>
              {deps &&
                (deps.ytDlp.installed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                ))}
            </div>
          </Row>

          <Row label="ffmpeg">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[12px]">
                {depsLoading ? "checking…" : (deps?.ffmpeg.version ?? "not found")}
              </span>
              {deps &&
                (deps.ffmpeg.installed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                ))}
            </div>
          </Row>

          <div className="py-1.5">
            <Button
              variant="link"
              className="text-[12.5px] text-primary hover:underline flex items-center gap-1.5 p-0 h-auto"
              onClick={() => checkUpdatesMutation.mutate()}
              disabled={checkUpdatesMutation.isPending}
            >
              {checkUpdatesMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Check for updates
            </Button>
          </div>
        </Section>

        {/* Danger Zone */}
        <Section icon={<ShieldAlert className="w-3.5 h-3.5" />} title="Danger zone" danger>
          <Row label="Reset download archive">
            <Button
              variant="ghost"
              className="text-[12px] text-destructive hover:underline p-0 h-auto"
              onClick={() =>
                openConfirmDialog({
                  title: "Reset download archive",
                  description:
                    "This will clear the record of all previously downloaded videos. Vault won't know what's already been downloaded and may re-download duplicates.",
                  confirmText: "Reset",
                  variant: "danger",
                  onConfirm: () => {
                    clearDownloadArchiveMutation.mutate(settings.downloadPath);
                  }
                })
              }
            >
              Reset
            </Button>
          </Row>
        </Section>
      </div>
    </div>
  );
};

function Section({
  icon,
  title,
  danger,
  children
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <div>
      <p
        className={cn(
          "text-[12px] font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5",
          danger ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {icon}
        {title}
      </p>
      <div
        className={cn(
          "border rounded-xl p-4 text-[13px] divide-y divide-border",
          danger ? "border-destructive/20" : "border-border"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  description,
  children
}: Readonly<{
  label: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <div className="flex items-center justify-between py-2 gap-4">
      <div>
        <span className="font-medium">{label}</span>
        {description && <p className="text-[11.5px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}
