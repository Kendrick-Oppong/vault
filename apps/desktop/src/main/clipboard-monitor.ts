import { clipboard, BrowserWindow } from "electron";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 1000;
const URL_PATTERN = /^https?:\/\/.+/i;

let pollTimer: NodeJS.Timeout | null = null;
let lastClipboardText = "";
let enabled = false;

/**
 * Start polling the system clipboard for URL changes.
 * When a new URL is detected, sends it to the renderer via IPC.
 */
export function startClipboardMonitor(
  sendToRenderer: (channel: string, ...args: unknown[]) => void
): void {
  if (pollTimer) return;

  // Initialize with current clipboard so we don't fire on app launch
  lastClipboardText = safeReadClipboard();

  pollTimer = setInterval(() => {
    if (!enabled) return;

    const current = safeReadClipboard();
    if (!current || current === lastClipboardText) return;

    lastClipboardText = current;
    const trimmed = current.trim();

    if (!URL_PATTERN.test(trimmed)) return;

    // Skip if the window is focused — user is likely about to paste manually
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0 && windows[0].isFocused()) return;

    logger.debug("Clipboard URL detected:", trimmed);
    sendToRenderer("clipboard:url-detected", trimmed);
  }, POLL_INTERVAL_MS);

  logger.info("Clipboard monitor started");
}

export function stopClipboardMonitor(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    logger.info("Clipboard monitor stopped");
  }
}

export function setClipboardMonitorEnabled(value: boolean): void {
  enabled = value;
  if (enabled) {
    // Reset so current clipboard content doesn't immediately trigger
    lastClipboardText = safeReadClipboard();
  }
  logger.debug("Clipboard monitor enabled:", value);
}

function safeReadClipboard(): string {
  try {
    return clipboard.readText();
  } catch {
    return "";
  }
}
