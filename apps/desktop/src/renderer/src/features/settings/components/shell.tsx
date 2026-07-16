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
  SlidersHorizontal,
  Globe,
  KeyRound,
  Sparkles,
  Info,
  ShieldAlert,
  RefreshCw,
  Minus,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FolderOpen,
  Cpu
} from "lucide-react";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings, useSettingsActions } from "@/stores/settings/settings.selectors";
import { useSetConcurrency } from "@/lib/mutations/downloads";
import { useUIState } from "@/stores/ui/ui.selectors";
import { useCookieInfo } from "@/lib/queries/cookies";
import { useSetCookieBrowser, useRefreshCookies, useClearCookies } from "@/lib/mutations/cookies";
import { useCheckForUpdates } from "@/lib/queries/app";
import { DependencyChecker } from "./dependency-checker";

export const SettingsView = () => {
  const settings = useSettingsStore(selectSettings);
  const { updateSetting } = useSettingsActions();
  const { theme, setTheme } = useUIState();
  const [bandwidthError, setBandwidthError] = useState(false);
  const [proxyError, setProxyError] = useState(false);
  const { mutate: setConcurrency } = useSetConcurrency();

  // React Query hooks for cookie management
  const { data: cookieInfo } = useCookieInfo();
  const setBrowserMutation = useSetCookieBrowser();
  const refreshMutation = useRefreshCookies();
  const clearMutation = useClearCookies();
  const checkUpdatesMutation = useCheckForUpdates();

  const cookieBusy =
    setBrowserMutation.isPending || refreshMutation.isPending || clearMutation.isPending;
  const cookieFailed = Boolean(cookieInfo?.effectiveBrowser && !cookieInfo.cached && !cookieBusy);

  const handleConcurrentChange = (delta: number) => {
    const newValue = Math.max(1, Math.min(10, settings.concurrentDownloads + delta));
    updateSetting("concurrentDownloads", newValue);
    setConcurrency(newValue);
  };

  const handleBandwidthChange = (value: string) => {
    updateSetting("bandwidthLimit", value);
    if (value && !/^\d+[KM]$/i.test(value)) {
      setBandwidthError(true);
    } else {
      setBandwidthError(false);
    }
  };

  const handleProxyChange = (value: string) => {
    updateSetting("proxy", value);
    if (value && !/^.+:\d+$/.test(value)) {
      setProxyError(true);
    } else {
      setProxyError(false);
    }
  };

  const handleResetArchive = () => {
    toast.warning("Download archive reset");
  };

  const handleCheckUpdates = () => {
    checkUpdatesMutation.mutate();
  };

  const handleSetCookieBrowser = (browser: string | null) => {
    setBrowserMutation.mutate(browser || "");
  };

  const handleRefreshCookies = () => {
    if (!settings.cookiesFromBrowser) return;
    refreshMutation.mutate(settings.cookiesFromBrowser);
  };

  const handleClearCookies = () => {
    clearMutation.mutate(settings.cookiesFromBrowser);
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
        {/* General Section */}
        <div>
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            General
          </p>
          <div className="border border-border rounded-xl p-4 text-[13px] divide-y divide-border">
            {/* Download Path */}
            <div className="flex items-center justify-between py-2 gap-4">
              <div>
                <span className="font-medium">Download folder</span>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Where downloaded files are saved
                </p>
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-1 max-w-xs">
                <Input
                  value={settings.downloadPath}
                  onChange={(e) => updateSetting("downloadPath", e.target.value)}
                  placeholder="~/Downloads"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={async () => {
                    const folder = await globalThis.api?.openFolderDialog?.();
                    if (folder) updateSetting("downloadPath", folder);
                  }}
                  title="Browse…"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Concurrent Downloads */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-medium">Concurrent downloads</span>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Max simultaneous downloads
                </p>
              </div>
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
            </div>

            {/* Minimize to Tray */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-medium">Minimize to tray</span>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Keep Vault running in the system tray when closed
                </p>
              </div>
              <Switch
                checked={settings.minimizeToTray}
                onCheckedChange={(checked) => updateSetting("minimizeToTray", checked)}
              />
            </div>

            {/* Embed Thumbnail */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-medium">Embed thumbnail</span>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Default setting for new downloads
                </p>
              </div>
              <Switch
                checked={settings.embedThumbnail}
                onCheckedChange={(checked) => updateSetting("embedThumbnail", checked)}
              />
            </div>

            {/* Embed Metadata */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-medium">Embed metadata</span>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Write title, channel, and date tags into the file
                </p>
              </div>
              <Switch
                checked={settings.embedMetadata}
                onCheckedChange={(checked) => updateSetting("embedMetadata", checked)}
              />
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between py-2">
              <span className="font-medium">Theme</span>
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
            </div>
          </div>
        </div>

        {/* Network Section */}
        <div>
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Network
          </p>
          <div className="border border-border rounded-xl p-4 text-[13px] divide-y divide-border">
            {/* Bandwidth Limit */}
            <div className="flex items-center justify-between py-2 gap-4">
              <div>
                <span className="font-medium">Bandwidth limit</span>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Cap download speed, e.g. <code>5M</code> or <code>500K</code>
                </p>
              </div>
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
            </div>

            {/* Proxy */}
            <div className="flex items-center justify-between py-2 gap-4">
              <div>
                <span className="font-medium">Proxy</span>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  SOCKS5/HTTP proxy, e.g. <code>127.0.0.1:1080</code>
                </p>
              </div>
              <div>
                <Input
                  value={settings.proxy}
                  onChange={(e) => handleProxyChange(e.target.value)}
                  className={`${proxyError ? "border-destructive" : ""}`}
                  placeholder="host:port"
                />
                {proxyError && (
                  <p className="text-[11px] text-destructive mt-0.5">Format: host:port</p>
                )}
              </div>
            </div>

            {/* Geo-bypass */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-medium">Geo-bypass</span>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Try to bypass region-locked content
                </p>
              </div>
              <Switch
                checked={settings.geoBypass}
                onCheckedChange={(checked) => updateSetting("geoBypass", checked)}
              />
            </div>
          </div>
        </div>

        {/* Authentication Section */}
        <div>
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Authentication
          </p>
          <div className="border border-border rounded-xl p-4 text-[13px] divide-y divide-border">
            {/* Cookie Browser */}
            <div className="flex items-center justify-between py-2 gap-4">
              <div>
                <span className="font-medium">Cookies browser</span>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Extract cookies from your browser to authenticate downloads
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={settings.cookiesFromBrowser || "none"}
                  onValueChange={(value) => handleSetCookieBrowser(value === "none" ? null : value)}
                >
                  <SelectTrigger className="h-8 w-32 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="chrome">Chrome</SelectItem>
                    <SelectItem value="firefox">Firefox</SelectItem>
                    <SelectItem value="safari">Safari</SelectItem>
                    <SelectItem value="edge">Edge</SelectItem>
                  </SelectContent>
                </Select>
                {settings.cookiesFromBrowser && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleRefreshCookies}
                      disabled={cookieBusy}
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
                      onClick={handleClearCookies}
                      disabled={cookieBusy}
                      title="Clear cookies"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Cookie status */}
            {cookieInfo?.effectiveBrowser && (
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
            )}
          </div>
        </div>

        {/* Dependencies Section */}
        <div>
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Dependencies
          </p>
          <DependencyChecker />
        </div>

        {/* About Section */}
        <div>
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            About
          </p>
          <div className="border border-border rounded-xl p-4 text-[13px] divide-y divide-border">
            <div className="flex items-center justify-between py-1.5">
              <span>Vault</span>
              <span className="text-muted-foreground">{settings.version}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span>yt-dlp engine</span>
              <span className="text-muted-foreground">{settings.ytDlpVersion}</span>
            </div>
            <div className="py-1.5">
              <Button
                variant="link"
                className="text-[12.5px] text-primary hover:underline flex items-center gap-1.5 p-0 h-auto"
                onClick={handleCheckUpdates}
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
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <p className="text-[12px] font-medium text-destructive uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Danger zone
          </p>
          <div className="border border-destructive/20 rounded-xl p-4 text-[13px] divide-y divide-border">
            <div className="flex items-center justify-between py-1.5">
              <span>Reset download archive</span>
              <Button
                variant="ghost"
                className="text-[12px] text-destructive hover:underline p-0 h-auto"
                onClick={handleResetArchive}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
