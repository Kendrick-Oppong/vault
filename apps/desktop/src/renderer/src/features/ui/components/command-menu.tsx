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
import { History, Link as LinkIcon, ListOrdered, Moon, Settings, Sun } from "lucide-react";
import { useNavigationState } from "@/stores/navigation/navigation.selectors";
import { useUIState } from "@/stores/ui/ui.selectors";
import { Kbd } from "@vault/ui/components/kbd";
import { getModifierKey } from "@/lib/utils/platform";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandMenu = ({ open, onOpenChange }: CommandMenuProps) => {
  const { navigate } = useNavigationState();
  const { theme, setTheme } = useUIState();

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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="max-w-lg!">
      <CommandInput placeholder="Search entire application..." />

      {/* CommandList with proper height and overflow */}
      <CommandList className="max-h-[300px] overflow-y-auto">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => run(() => navigate("queue"))}>
            <ListOrdered className="h-4 w-4" />
            <span>Go to Queue</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("history"))}>
            <History className="h-4 w-4" />
            <span>Go to History</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("settings"))}>
            <Settings className="h-4 w-4" />
            <span>Go to Settings</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
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
        </CommandGroup>
      </CommandList>

      {/*footer - stays at bottom */}
      <CommandSeparator className="mt-2" />
      <div className=" px-3 py-2 bg-popover">
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
