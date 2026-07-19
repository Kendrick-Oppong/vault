function isMac() {
  return typeof window !== "undefined" && window.navigator.userAgent.includes("Mac");
}

export function getModifierKey() {
  return isMac() ? "⌘" : "Ctrl";
}

/**
 * Formats a byte count into a human-readable string (B, KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Returns a human-readable relative time string (e.g., "5m ago", "2h ago").
 */
export function getTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return `yesterday`;
  if (diffDays >= 3) {
    const day = date.getDate();
    const suffix = ["th", "st", "nd", "rd"][(day % 10 > 3 ? 0 : (day % 100) - (day % 10) !== 10 ? day % 10 : 0)];
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    return `${day}${suffix} ${month} ${year}`;
  }
  return `${diffDays} days ago`;
}
