import { useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Copy, Trash2 } from "lucide-react";
import { useLogsState, useLogsActions } from "@/stores/logs/logs.selectors";
import type { LogEntry } from "@/stores/logs/logs.store";

type Level = LogEntry["level"];
const LEVELS: Level[] = ["debug", "info", "warn", "error"];

const LEVEL_STYLE: Record<Level, string> = {
  debug: "text-muted-foreground",
  info: "text-sky-400",
  warn: "text-amber-400",
  error: "text-destructive"
};

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour12: false });
}

export const LogsView = () => {
  const { entries } = useLogsState();
  const { clearLogs } = useLogsActions();
  const [active, setActive] = useState<Set<Level>>(new Set(LEVELS));
  const [follow, setFollow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => entries.filter((l) => active.has(l.level)), [entries, active]);

  // Scroll to bottom when follow is on and new entries arrive
  const prevLenRef = useRef(0);
  if (follow && visible.length !== prevLenRef.current) {
    prevLenRef.current = visible.length;
    // Use a ref callback instead of useEffect
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }

  const toggleLevel = (level: Level) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next.size === 0 ? new Set(LEVELS) : next;
    });
  };

  const copyAll = () => {
    const text = visible
      .map((l) => `[${formatTime(l.timestamp)}] ${l.level.toUpperCase()} ${l.message}`)
      .join("\n");
    void navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex h-full flex-col gap-3 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold">Logs</h1>
        <div className="flex items-center gap-1.5">
          {LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={`rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors ${
                active.has(level)
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {level}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <button
            onClick={() => setFollow((v) => !v)}
            title="Follow new logs"
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              follow
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownToLine size={13} />
            Tail
          </button>
          <button
            onClick={copyAll}
            title="Copy visible logs"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Copy size={13} />
            Copy
          </button>
          <button
            onClick={clearLogs}
            title="Clear logs"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={13} />
            Clear
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-border bg-black/30 p-3 font-mono text-xs leading-relaxed"
      >
        {visible.length === 0 ? (
          <p className="text-muted-foreground">No log entries.</p>
        ) : (
          visible.map((entry) => (
            <div key={entry.id} className="flex gap-2 whitespace-pre-wrap break-all">
              <span className="shrink-0 text-muted-foreground/60">
                {formatTime(entry.timestamp)}
              </span>
              <span className={`shrink-0 uppercase font-bold ${LEVEL_STYLE[entry.level]}`}>
                {entry.level}
              </span>
              {entry.context && (
                <span className="shrink-0 text-muted-foreground/60">[{entry.context}]</span>
              )}
              <span className="text-foreground/80">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
