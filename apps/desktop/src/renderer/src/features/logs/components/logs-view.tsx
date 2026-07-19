import { useMemo, useRef, useState, useEffect } from "react";
import { ArrowDownToLine, Copy, Check } from "lucide-react";
import { Button } from "@vault/ui/components/button";
import { useLogsHistory } from "@/lib/queries/logs";

type Level = "info" | "warn" | "error" | "debug";
const LEVELS: Level[] = ["debug", "info", "warn", "error"];

const LEVEL_STYLE: Record<Level, string> = {
  debug: "text-muted-foreground",
  info: "text-sky-400",
  warn: "text-primary",
  error: "text-destructive"
};

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour12: false });
}

export const LogsView = () => {
  const { data: entries = [], isLoading } = useLogsHistory();
  const [active, setActive] = useState<Set<Level>>(new Set(LEVELS));
  const [follow, setFollow] = useState(true);
  const [copied, setCopied] = useState(false);
  const [followJustToggled, setFollowJustToggled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => entries.filter((l) => active.has(l.level)), [entries, active]);

  // Scroll to bottom when follow is on and new entries arrive
  useEffect(() => {
    if (follow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visible.length, follow]);

  const toggleLevel = (level: Level) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next.size === 0 ? new Set(LEVELS) : next;
    });
  };

  const toggleFollow = () => {
    setFollow((v) => !v);
    setFollowJustToggled(true);
    setTimeout(() => setFollowJustToggled(false), 1500);
  };

  const copyAll = () => {
    const text = visible
      .map((l) => `[${formatTime(l.timestamp)}] ${l.level.toUpperCase()} ${l.message}`)
      .join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col gap-3 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold">Logs</h1>
        <div className="flex items-center gap-1.5">
          {LEVELS.map((level) => (
            <Button
              key={level}
              variant={active.has(level) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => toggleLevel(level)}
              className="text-xs capitalize"
            >
              {level}
            </Button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <Button
            variant={follow ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleFollow}
            title={follow ? "Stop following new logs" : "Follow new logs"}
            className="text-xs"
          >
            <ArrowDownToLine size={13} className="mr-1" />
            {followJustToggled ? (follow ? "Following" : "Paused") : "Tail"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAll}
            title="Copy visible logs"
            className="text-xs"
          >
            {copied ? (
              <Check size={13} className="mr-1 text-green-500" />
            ) : (
              <Copy size={13} className="mr-1" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-border bg-secondary/60 p-3 font-mono text-xs leading-relaxed"
      >
        {isLoading ? (
          <p className="text-muted-foreground">Loading logs...</p>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground">No log entries.</p>
        ) : (
          visible.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              className="flex gap-2 whitespace-pre-wrap break-all"
            >
              <span className="shrink-0 text-muted-foreground/60">
                {formatTime(entry.timestamp)}
              </span>
              <span className={`shrink-0 uppercase font-bold ${LEVEL_STYLE[entry.level]}`}>
                {entry.level}
              </span>
              <span className="text-foreground/80">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
