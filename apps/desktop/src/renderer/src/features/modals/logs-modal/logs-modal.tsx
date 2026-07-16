import { useUIStore } from "@/stores/ui/ui.store";
import { useLogsState, useLogsActions } from "@/stores/logs/logs.selectors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@vault/ui/components/dialog";
import { Button } from "@vault/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@vault/ui/components/select";
import { Trash2, Download } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";

interface LogsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LogsModal = ({ open, onOpenChange }: LogsModalProps) => {
  const { entries, filter } = useLogsState();
  const { setFilter, clearLogs } = useLogsActions();

  const filteredEntries = filter === "all" ? entries : entries.filter((e) => e.level === filter);

  const handleExport = () => {
    const text = filteredEntries
      .map(
        (entry) =>
          `[${new Date(entry.timestamp).toISOString()}] [${entry.level.toUpperCase()}] ${entry.context ? `[${entry.context}] ` : ""}${entry.message}`
      )
      .join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vault-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-destructive";
      case "warn":
        return "text-yellow-500";
      case "info":
        return "text-primary";
      case "debug":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Application Logs</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warnings</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredEntries.length} entries
          </span>
        </div>

        <div className="flex-1 overflow-y-auto bg-secondary/20 rounded-md border border-border p-3 text-xs space-y-1">
          {filteredEntries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No logs to display</div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="flex gap-2 text-foreground/80">
                <span className="text-muted-foreground w-24 shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className={cn("w-8 shrink-0 font-bold", getLevelColor(entry.level))}>
                  {entry.level.toUpperCase()}
                </span>
                {entry.context && (
                  <span className="text-muted-foreground w-24 shrink-0">[{entry.context}]</span>
                )}
                <span className="flex-1">{entry.message}</span>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => clearLogs()}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
