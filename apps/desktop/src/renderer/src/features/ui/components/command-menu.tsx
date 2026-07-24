import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@vault/ui/components/command";
import {
  Download,
  FileText,
  Globe,
  History,
  Info,
  KeyRound,
  Link as LinkIcon,
  ListOrdered,
  Moon,
  Palette,
  RefreshCw,
  ScrollText,
  Settings,
  ShieldAlert,
  Sun
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigationState } from "@/stores/navigation/navigation.selectors";
import { useUIState } from "@/stores/ui/ui.selectors";
import { Kbd } from "@vault/ui/components/kbd";
import { getModifierKey } from "@/lib/utils/platform";
import { useCheckForUpdates } from "@/lib/queries/app";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SettingsItem {
  label: string;
  description: string;
  /** Space-separated synonyms used by cmdk's fuzzy filter via the `value` prop */
  keywords: string;
  /** Matches the `id` placed on the Section div in settings/shell.tsx */
  sectionId: string;
  icon: LucideIcon;
}

const SETTINGS_ITEMS: SettingsItem[] = [
  // ── Downloads ────────────────────────────────────────────────────
  {
    label: "Download folder",
    description: "Where downloaded files are saved",
    keywords: "path output location directory save folder",
    sectionId: "settings-downloads",
    icon: Download
  },
  {
    label: "Output template",
    description: "yt-dlp filename template",
    keywords: "filename naming format template ytdlp pattern",
    sectionId: "settings-downloads",
    icon: Download
  },
  {
    label: "Playlist fetch limit",
    description: "Max items fetched from a playlist",
    keywords: "playlist limit items count max",
    sectionId: "settings-downloads",
    icon: Download
  },
  {
    label: "Concurrent downloads",
    description: "Max simultaneous downloads",
    keywords: "parallel simultaneous workers threads queue concurrent",
    sectionId: "settings-downloads",
    icon: Download
  },
  // ── Metadata ─────────────────────────────────────────────────────
  {
    label: "Embed thumbnail",
    description: "Embed cover art into the downloaded file",
    keywords: "thumbnail cover art image embed",
    sectionId: "settings-metadata",
    icon: FileText
  },
  {
    label: "Embed metadata",
    description: "Write title, channel, and date tags into the file",
    keywords: "tags id3 metadata title channel date info",
    sectionId: "settings-metadata",
    icon: FileText
  },
  {
    label: "Embed chapters",
    description: "Include YouTube chapter markers",
    keywords: "chapters markers timestamps sections",
    sectionId: "settings-metadata",
    icon: FileText
  },
  {
    label: "Write subtitles",
    description: "Download subtitles alongside the video",
    keywords: "subtitles captions srt vtt closed captions language",
    sectionId: "settings-metadata",
    icon: FileText
  },
  {
    label: "Remove sponsored segments",
    description: "Auto-cut sponsor, intro, and outro segments (SponsorBlock)",
    keywords: "sponsorblock sponsor skip ads intro outro segments cut",
    sectionId: "settings-metadata",
    icon: FileText
  },
  {
    label: "Download archive",
    description: "Skip already downloaded files",
    keywords: "archive duplicate history skip record already downloaded",
    sectionId: "settings-metadata",
    icon: FileText
  },
  {
    label: "Default container",
    description: "Video container format (MP4 or MKV)",
    keywords: "container format mp4 mkv video merge codec",
    sectionId: "settings-metadata",
    icon: FileText
  },
  // ── Appearance ───────────────────────────────────────────────────
  {
    label: "Theme",
    description: "Light, dark, or system theme",
    keywords: "theme dark light mode appearance color scheme system",
    sectionId: "settings-appearance",
    icon: Palette
  },
  {
    label: "Minimize to tray",
    description: "Keep Vault running in the system tray when closed",
    keywords: "tray minimize background system hidden close",
    sectionId: "settings-appearance",
    icon: Palette
  },
  // ── Network ──────────────────────────────────────────────────────
  {
    label: "Bandwidth limit",
    description: "Cap download speed",
    keywords: "bandwidth speed limit throttle rate slow cap 5M 500K",
    sectionId: "settings-network",
    icon: Globe
  },
  {
    label: "Proxy",
    description: "SOCKS5/HTTP proxy configuration",
    keywords: "proxy vpn socks http network tunnel host port",
    sectionId: "settings-network",
    icon: Globe
  },
  {
    label: "Geo-bypass",
    description: "Bypass region-locked content",
    keywords: "geo bypass region lock vpn country restricted block",
    sectionId: "settings-network",
    icon: Globe
  },
  // ── Authentication ───────────────────────────────────────────────
  {
    label: "Cookies browser",
    description: "Extract cookies from your browser to authenticate",
    keywords: "cookies auth authentication browser login chrome firefox edge",
    sectionId: "settings-auth",
    icon: KeyRound
  },
  // ── About ────────────────────────────────────────────────────────
  {
    label: "Check for updates",
    description: "See if a newer version of Vault is available",
    keywords: "updates version upgrade changelog release new",
    sectionId: "settings-about",
    icon: Info
  },
  // ── Danger Zone ──────────────────────────────────────────────────
  {
    label: "Reset download archive",
    description: "Clear the record of all previously downloaded videos",
    keywords: "reset archive clear danger wipe history",
    sectionId: "settings-danger",
    icon: ShieldAlert
  }
];

export const CommandMenu = ({ open, onOpenChange }: CommandMenuProps) => {
  const { navigate } = useNavigationState();
  const { theme, setTheme } = useUIState();
  const checkUpdatesMutation = useCheckForUpdates();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        onOpenChange(true);
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const run = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  /** Navigate to Settings then flash a ring highlight on the target section. */
  const navigateToSetting = (sectionId: string) => {
    onOpenChange(false);
    navigate("settings");
    // Wait for the Settings view to mount before scrolling + highlighting
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "start" });

      // Flash the ring — CSS animation self-removes via animationend
      el.classList.add("section-highlighted");
      el.addEventListener("animationend", () => el.classList.remove("section-highlighted"), {
        once: true
      });
    }, 120);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="max-w-lg!">
      <CommandInput placeholder="Search pages, settings, actions..." />

      <CommandList className="max-h-[380px] overflow-y-auto">
        <CommandEmpty>No results found.</CommandEmpty>

        {/* ── Navigation ─────────────────────────────────────── */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => run(() => navigate("queue"))}>
            <ListOrdered className="h-4 w-4" />
            <span>Go to Queue</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("history"))}>
            <History className="h-4 w-4" />
            <span>Go to History</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("logs"))}>
            <ScrollText className="h-4 w-4" />
            <span>Go to Logs</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("settings"))}>
            <Settings className="h-4 w-4" />
            <span>Go to Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ── Settings search ────────────────────────────────── */}
        <CommandGroup heading="Settings">
          {SETTINGS_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.label}
                value={`${item.label} ${item.keywords}`}
                onSelect={() => navigateToSetting(item.sectionId)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span>{item.label}</span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {item.description}
                  </span>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        {/* ── Actions ────────────────────────────────────────── */}
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() =>
              run(() => {
                const newTheme = theme === "dark" ? "light" : "dark";
                setTheme(newTheme);
              })
            }
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>Toggle theme</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => document.getElementById("url-input")?.focus())}>
            <LinkIcon className="h-4 w-4" />
            <span>Focus link input</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                checkUpdatesMutation.mutate();
              })
            }
          >
            <RefreshCw className="h-4 w-4" />
            <span>Check for updates</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <CommandSeparator className="mt-2" />
      <div className="px-3 py-2 bg-popover">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span className="mx-1">Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <Kbd>Enter</Kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <Kbd>ESC</Kbd>
              <span>Close</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Kbd>{getModifierKey()}</Kbd>
            <Kbd>K</Kbd>
            <span className="ml-1">Open</span>
          </div>
        </div>
      </div>
    </CommandDialog>
  );
};
