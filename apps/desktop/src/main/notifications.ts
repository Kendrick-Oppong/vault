import { Notification, BrowserWindow } from "electron";
import { join } from "node:path";
import type { Job } from "@vault/types";
import { logger } from "./logger";

const ICON = join(__dirname, "../../resources/icon.png");

/**
 * Keep live references to active notifications so the GC doesn't collect
 * them before Windows actually renders them. Without this, notifications
 * are created and immediately garbage-collected — they never appear.
 */
const activeNotifications = new Set<Notification>();

/** Show a desktop notification for a finished download, respecting the user setting. */
export function notifyDownloadComplete(job: Job, enabled: boolean): void {
  if (!enabled) {
    logger.debug("Desktop notifications disabled by user setting");
    return;
  }

  if (!Notification.isSupported()) {
    logger.debug("Desktop notifications not supported on this platform");
    return;
  }

  const success = job.status === "completed";
  const notification = new Notification({
    title: success ? "Download complete" : "Download failed",
    body: success
      ? job.meta?.title || "Download finished"
      : `${job.meta?.title || "Download"} failed`,
    icon: ICON,
    silent: false
  });

  // Prevent garbage collection until the notification is dismissed
  activeNotifications.add(notification);

  notification.on("click", () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });

  // Clean up reference when the notification is closed (user dismisses it or it auto-hides)
  notification.on("close", () => {
    activeNotifications.delete(notification);
  });

  notification.show();
  logger.info("Desktop notification shown for job:", job.id);
}
