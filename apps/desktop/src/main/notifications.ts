import { Notification, BrowserWindow } from "electron";
import { join } from "node:path";
import type { Job } from "@vault/types";
import { logger } from "./logger";

const ICON = join(__dirname, "../../resources/icon.png");

/** Show a desktop notification for a finished download, respecting the user setting. */
export function notifyDownloadComplete(job: Job, enabled: boolean): void {
  if (!enabled || !Notification.isSupported()) {
    logger.debug("Desktop notifications disabled or not supported");
    return;
  }

  const success = job.status === "completed";
  const notification = new Notification({
    title: success ? "Download complete" : "Download failed",
    body: success
      ? job.meta?.title || "Download finished"
      : `${job.meta?.title || "Download"} - ${job.error || "unknown error"}`,
    icon: ICON,
    silent: false
  });

  notification.on("click", () => {
    // Restore and focus the main window when notification is clicked
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });

  notification.show();
  logger.info("Desktop notification shown for job:", job.id);
}
