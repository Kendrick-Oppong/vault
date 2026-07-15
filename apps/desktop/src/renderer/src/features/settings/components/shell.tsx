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
  CheckCircle2,
  LogIn,
  LogOut,
  Upload
} from "lucide-react";
import { toast } from "sonner";
import type { Settings } from "../types";
import { useSettingsStore } from "@/stores/settings/settings.store";
import { selectSettings, useSettingsActions } from "@/stores/settings/settings.selectors";
import { useSetConcurrency } from "@/lib/mutations/downloads";
import { useYoutubeAuth } from "@/lib/queries/auth";
import { useYoutubeLogin, useYoutubeLogout } from "@/lib/mutations/auth";

export const SettingsView = () => {
  const settings = useSettingsStore(selectSettings);
  const { updateSetting } = useSettingsActions();
  const [bandwidthError, setBandwidthError] = useState(false);
  const [proxyError, setProxyError] = useState(false);
  const { data: ytSignedIn = false } = useYoutubeAuth();
  const loginMutation = useYoutubeLogin();
  const logoutMutation = useYoutubeLogout();
  const { mutate: setConcurrency } = useSetConcurrency();

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

  const handleImportCookies = async () => {
    try {
      const filePath = await window.api.openFileDialog({
        title: "Select cookies JSON file",
        filters: [{ name: "JSON Files", extensions: ["json"] }]
      });

      if (!filePath) return;

      const result = await window.api.importCookies(filePath);

      if (result.success) {
        toast.success("Cookies imported successfully! Restart any failed downloads to use them.");
        // Update settings to show the cookies file path
        if (result.filePath) {
          updateSetting("cookiesFilePath", result.filePath);
          updateSetting("importCookies", "File");
        }
      } else {
        toast.error(`Failed to import cookies: ${result.error}`);
      }
    } catch (err) {
      toast.error(`Error importing cookies: ${err instanceof Error ? err.message : String(err)}`);
    }
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
            Authentication
          </p>
          <div className="border border-border rounded-xl p-4 text-[13px] divide-y divide-border">
            {/* Primary: Built-in YouTube sign-in */}
            <div className="flex items-center justify-between py-1.5">
              <div className="min-w-0">
                <span>YouTube sign-in</span>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Opens a secure browser window to log in. No extensions needed.
                </p>
              </div>
              {ytSignedIn ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1.5 text-[12px] text-green-500">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Signed in
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[12px] text-muted-foreground hover:text-destructive"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[12px]"
                    disabled={loginMutation.isPending}
                    onClick={() => loginMutation.mutate()}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    {loginMutation.isPending ? "Waiting for login..." : "Sign in"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[12px]"
                    onClick={handleImportCookies}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import cookies
                  </Button>
                </div>
              )}
            </div>

            {/* Show cookies file path as readonly when signed in */}
            {ytSignedIn && settings.cookiesFilePath && (
              <div className="flex items-center justify-between py-1.5 gap-2">
                <span className="shrink-0 text-muted-foreground">Cookies file</span>
                <Input
                  value={settings.cookiesFilePath}
                  readOnly
                  className="flex-1 max-w-[280px] bg-secondary/40 border-border text-[11px] text-muted-foreground cursor-default"
                />
              </div>
            )}

            {/* Advanced: Browser cookie import (fallback) */}
            <div className="flex items-center justify-between py-1.5">
              <div className="min-w-0">
                <span>Advanced: import from browser</span>
                {settings.importCookies !== "None" && settings.importCookies !== "File" && (
                  <p className="text-[11.5px] text-amber-500/80 mt-0.5">
                    Chrome/Edge lock their cookie database on Windows. Use sign-in above for reliability.
                  </p>
                )}
              </div>
              <Select
                value={settings.importCookies === "File" ? "None" : settings.importCookies}
                onValueChange={(value) =>
                  updateSetting("importCookies", value as Settings["importCookies"])
                }
              >
                <SelectTrigger className="w-36 h-8 rounded-md bg-secondary/60 border-border text-[12px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Chrome">Chrome</SelectItem>
                  <SelectItem value="Firefox">Firefox</SelectItem>
                  <SelectItem value="Edge">Edge</SelectItem>
                  <SelectItem value="Safari">Safari</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11.5px] text-muted-foreground pt-2">
              Needed for private playlists, watch-later, and age-restricted videos.
            </p>
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
