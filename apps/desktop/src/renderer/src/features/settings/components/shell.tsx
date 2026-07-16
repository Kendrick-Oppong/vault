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
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings, useSettingsActions } from "@/stores/settings/settings.selectors";
import { useSetConcurrency } from "@/lib/mutations/downloads";
import { useUIState } from "@/stores/ui/ui.selectors";
import { useCookieInfo } from "@/lib/queries/cookies";
import { useSetCookieBrowser, useRefreshCookies, useClearCookies } from "@/lib/mutations/cookies";

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

  const cookieBusy = setBrowserMutation.isPending || refreshMutation.isPending || clearMutation.isPending;
  const cookieFailed = Boolean(cookieInfo?.effectiveBrowser && !cookieInfo.cached && !cookieBusy);

  const handleConcurrentChange = (delta: number) => {
    const newValue = Math.max(1, Math.min(10, settings.concurrentDownloads + delta));
    updateSetting("concurrentDownloads", newValue);
    setConcurrency(newValue);
  };

  const handleBandwidthChange = (value: string) => {
    updateSetting("bandwidthLimit", value);
    // Simple validation for K/M format
    if (value && !/^\d+[KM]$/i.test(value)) {
      setBandwidthError(true);
    } else {
      setBandwidthError(false);
    }
  };

  const handleProxyChange = (value: string) => {
    updateSetting("proxy", value);
    // Simple validation for host:port
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
    toast.info("Checking for updates...");
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
            <div className="flex items-center justify-between py-1.5">
              <span>Default destination folder</span>
              <Input
                value={settings.downloadPath}
                onChange={(e) => updateSetting("downloadPath", e.target.value)}
                className="w-1/2 bg-secondary/60 border-border-strong text-[12px]"
              />
            </div>
            <div className="py-1.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <span>Output filename template</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Use %(title)s for title, %(id)s for video ID, %(ext)s for extension
                  </p>
                </div>
                <Input
                  value={settings.outputTemplate || "%(title)s.%(ext)s"}
                  onChange={(e) => updateSetting("outputTemplate", e.target.value)}
                  placeholder="%(title)s.%(ext)s"
                  className="w-56 bg-secondary/60 border-border-strong text-[12px]"
                />
              </div>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span>Concurrent downloads</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-7 h-7 rounded-md border-border hover:bg-accent"
                  onClick={() => handleConcurrentChange(-1)}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-6 text-center text-[12px]">{settings.concurrentDownloads}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-7 h-7 rounded-md border-border hover:bg-accent"
                  onClick={() => handleConcurrentChange(1)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span>Minimize to tray instead of closing</span>
              <Switch
                checked={settings.minimizeToTray}
                onCheckedChange={(checked) => updateSetting("minimizeToTray", checked)}
              />
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span>Appearance</span>
              <Select value={theme} onValueChange={(value) => setTheme(value as any)}>
                <SelectTrigger className="w-40 bg-secondary/60 border-border text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
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
            <div className="py-1.5">
              <div className="flex items-center justify-between">
                <span>Bandwidth limit</span>
                <Input
                  value={settings.bandwidthLimit}
                  onChange={(e) => handleBandwidthChange(e.target.value)}
                  placeholder="e.g. 2M or 500K"
                  className={`w-40 bg-secondary/60 border-border text-[12px] text-right ${bandwidthError ? "border-destructive" : ""
                    }`}
                />
              </div>
              {bandwidthError && (
                <p className="text-[11px] text-destructive mt-1">
                  Expected a number followed by K or M, e.g. 2M
                </p>
              )}
            </div>
            <div className="py-1.5">
              <div className="flex items-center justify-between">
                <span>Proxy</span>
                <Input
                  value={settings.proxy}
                  onChange={(e) => handleProxyChange(e.target.value)}
                  placeholder="host:port"
                  className={`w-56 bg-secondary/60 border-border text-[12px] ${proxyError ? "border-destructive" : ""
                    }`}
                />
              </div>
              {proxyError && (
                <p className="text-[11px] text-destructive mt-1 text-right">
                  Expected host:port, e.g. 127.0.0.1:8080
                </p>
              )}
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span>Geo-bypass</span>
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
            Cookies
          </p>
          <div className="border border-border rounded-xl p-4 text-[13px] divide-y divide-border">
            <div className="py-1.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <span className="block text-sm">Import cookies from browser</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Access private, age-restricted, and members-only videos by reusing your browser session
                  </p>
                </div>
                <Select
                  value={settings.cookiesFromBrowser || ""}
                  onValueChange={handleSetCookieBrowser}
                  disabled={cookieBusy}
                >
                  <SelectTrigger className="w-40 bg-secondary/60 border-border text-[12px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Disabled</SelectItem>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    {cookieInfo?.detected.map((browser) => (
                      <SelectItem key={browser.name} value={browser.name}>
                        {browser.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {cookieInfo && cookieInfo.detected.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90 mt-3">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>No supported browsers detected on this machine</span>
              </div>
            ) : settings.cookiesFromBrowser ? (
              <>
                {/* Cookie Status */}
                <div className="py-3">
                  {cookieBusy ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Exporting cookies...</span>
                    </div>
                  ) : cookieFailed || (!cookieInfo?.cached && cookieInfo?.effectiveBrowser) ? (
                    <div className="flex items-center gap-2 text-xs text-amber-300">
                      <AlertTriangle size={14} />
                      <span>No cookies imported yet</span>
                    </div>
                  ) : cookieInfo?.cached ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-emerald-300">
                          Cookies ready (imported {formatCookieAge(cookieInfo.ageMs)})
                        </span>
                      </div>
                      {cookieInfo.effectiveLabel && (
                        <p className="pl-6 text-xs text-muted-foreground">
                          Using {cookieInfo.effectiveLabel}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Help Text */}
                <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground mt-3">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  <span>
                    Tip: close {cookieInfo?.effectiveLabel || "your browser"} completely before
                    refreshing. A running browser locks its cookie database and the export will fail.
                  </span>
                </div>

                {cookieFailed && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90 mt-3">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>
                      Couldn't read cookies. Make sure {cookieInfo?.effectiveLabel || "your browser"}{" "}
                      is fully closed (check the system tray), then press Refresh.
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshCookies}
                    disabled={cookieBusy}
                    className="h-8 text-[12px]"
                  >
                    <RefreshCw size={13} className={cookieBusy ? "animate-spin" : ""} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCookies}
                    disabled={cookieBusy}
                    className="h-8 text-[12px] hover:border-destructive/40 hover:text-destructive"
                  >
                    <Trash2 size={13} />
                    Clear
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Defaults Section */}
        <div>
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Defaults
          </p>
          <div className="border border-border rounded-xl p-4 text-[13px] divide-y divide-border">
            <div className="flex items-center justify-between py-1.5">
              <span>Embed thumbnail</span>
              <Switch
                checked={settings.embedThumbnail}
                onCheckedChange={(checked) => updateSetting("embedThumbnail", checked)}
              />
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span>Embed metadata &amp; chapters</span>
              <Switch
                checked={settings.embedMetadata}
                onCheckedChange={(checked) => updateSetting("embedMetadata", checked)}
              />
            </div>
          </div>
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
            <Button
              variant="link"
              className="mt-1 text-[12.5px] text-primary hover:underline flex items-center gap-1.5 p-0 h-auto"
              onClick={handleCheckUpdates}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Check for updates
            </Button>
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
