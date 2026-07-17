/**
 * Formats error messages to be concise and user-friendly.
 * Strips away verbose Electron IPC error prefixes and stack traces.
 */
export function formatError(error: unknown): string {
  // Handle null/undefined early
  if (error === null) {
    return "An unknown error occurred";
  }

  // Handle Error objects
  if (error instanceof Error) {
    let message = error.message?.trim() || "An error occurred";

    // Strip "Error invoking remote method '...': " prefix from Electron IPC errors
    const ipcMatch = /Error invoking remote method '.+?': (.+)/.exec(message);
    if (ipcMatch?.[1]) {
      message = ipcMatch[1].trim();
    }

    // Remove "Error: " prefix if it exists (handle multiple occurrences)
    while (message.startsWith("Error: ")) {
      message = message.substring(7).trim();
    }

    // Handle nested "Error: Error: Error: " patterns more robustly
    const parts = message.split("Error: ").filter((part) => part.trim());
    if (parts.length > 0) {
      message = parts.at(-1)?.trim() ?? "";
    }

    // Handle empty message after processing
    if (!message || message.length === 0) {
      return "An error occurred";
    }

    // Handle common error patterns (case-insensitive for robustness)
    const lowerMessage = message.toLowerCase();

    // yt-dlp specific errors
    if (lowerMessage.includes("yt-dlp download failed")) {
      // Extract the actual error message from yt-dlp
      const ytDlpMatch = message.match(/yt-dlp download failed \(code \d+\):\s*(.+)/s);
      if (ytDlpMatch?.[1]) {
        const ytDlpError = ytDlpMatch[1].trim();
        // Handle common yt-dlp errors
        if (
          lowerMessage.includes("sign in to confirm") ||
          lowerMessage.includes("authentication")
        ) {
          return "Authentication required. Enable cookies in settings.";
        }
        if (lowerMessage.includes("video unavailable") || lowerMessage.includes("not available")) {
          return "Video is unavailable or has been removed.";
        }
        if (lowerMessage.includes("private video")) {
          return "This is a private video. Enable cookies to access it.";
        }
        if (lowerMessage.includes("age restricted") || lowerMessage.includes("age-gate")) {
          return "Age-restricted video. Enable cookies to access it.";
        }
        if (lowerMessage.includes("copyright") || lowerMessage.includes("blocked")) {
          return "Video is blocked due to copyright restrictions.";
        }
        if (lowerMessage.includes("postprocessing") && lowerMessage.includes("thumbnail")) {
          return "Thumbnail embedding failed. Try disabling thumbnail embedding.";
        }
        if (lowerMessage.includes("ffmpeg") || lowerMessage.includes("avconv")) {
          return "FFmpeg error. Check your FFmpeg installation.";
        }
        if (lowerMessage.includes("network") || lowerMessage.includes("connection")) {
          return "Network error. Check your internet connection.";
        }
        // Return a cleaner version of the yt-dlp error
        return ytDlpError.split("\n")[0].substring(0, 100);
      }
      // Handle case where error code is present but no message
      const codeMatch = message.match(/yt-dlp download failed \(code (\d+)\)/);
      if (codeMatch?.[1]) {
        const code = parseInt(codeMatch[1], 10);
        // Common yt-dlp exit codes
        if (code === 1) return "Download failed. Check the video URL or your connection.";
        if (code === 2) return "Command-line error. Invalid parameters or configuration.";
        if (code === 3) return "File not found or download error.";
        if (code === 4) return "Network error or connection timeout.";
        return `Download failed (code ${code})`;
      }
    }

    // Network errors
    if (lowerMessage.includes("econnrefused")) {
      return "Connection refused. Is the service running?";
    }
    if (lowerMessage.includes("enotfound")) {
      return "Server not found. Check your internet connection.";
    }
    if (lowerMessage.includes("etimedout")) {
      return "Request timed out. Please try again.";
    }
    if (lowerMessage.includes("eacces") || lowerMessage.includes("eperm")) {
      return "Permission denied. Check file permissions.";
    }
    if (lowerMessage.includes("enoent")) {
      return "File or directory not found.";
    }
    if (lowerMessage.includes("eexist")) {
      return "File or directory already exists.";
    }
    if (lowerMessage.includes("enospc")) {
      return "Not enough disk space.";
    }

    // Truncate very long messages
    if (message.length > 150) {
      return message.substring(0, 150).trim() + "...";
    }

    return message;
  }

  // Handle string errors
  if (typeof error === "string") {
    const message = error.trim();

    // Handle empty strings
    if (!message || message.length === 0) {
      return "An unknown error occurred";
    }

    // Handle HTTP errors (case-insensitive)
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("404")) {
      return "Resource not found (404)";
    }
    if (lowerMessage.includes("401") || lowerMessage.includes("403")) {
      return "Authentication failed";
    }
    if (lowerMessage.includes("500")) {
      return "Server error (500). Please try again later.";
    }
    if (lowerMessage.includes("502") || lowerMessage.includes("503")) {
      return "Service unavailable. Please try again later.";
    }

    // Handle network errors
    if (lowerMessage.includes("net::err_internet_disconnected")) {
      return "No internet connection";
    }
    if (lowerMessage.includes("net::err_network_changed")) {
      return "Network changed. Please retry.";
    }
    if (lowerMessage.includes("net::err_connection_reset")) {
      return "Connection was reset. Please retry.";
    }

    // Take first line only and truncate if needed
    const firstLine = message.split("\n")[0].trim();
    if (!firstLine || firstLine.length === 0) {
      return "An error occurred";
    }

    if (firstLine.length > 150) {
      return firstLine.substring(0, 150).trim() + "...";
    }

    return firstLine;
  }

  // Handle number errors (edge case but possible)
  if (typeof error === "number") {
    // HTTP status codes
    if (error === 404) return "Resource not found (404)";
    if (error === 401 || error === 403) return "Authentication failed";
    if (error === 500) return "Server error (500)";
    if (error === 502 || error === 503) return "Service unavailable";
    return `Error code: ${error}`;
  }

  // Handle boolean errors (unlikely but possible)
  if (typeof error === "boolean") {
    return "An unexpected error occurred";
  }

  // Handle objects with message property
  if (typeof error === "object") {
    // Check for message property (common in error-like objects)
    if ("message" in error && error.message) {
      return formatError(error.message);
    }

    // Check for error property (nested error objects)
    if ("error" in error && error.error) {
      return formatError(error.error);
    }

    // Check for description property
    if ("description" in error && error.description) {
      return formatError(error.description);
    }

    // Check for statusText (HTTP responses)
    if ("statusText" in error && typeof error.statusText === "string") {
      return error.statusText || "An error occurred";
    }

    // Try to stringify the object as last resort
    try {
      const stringified = JSON.stringify(error);
      if (stringified && stringified !== "{}" && stringified !== "null") {
        // Limit length
        const limited =
          stringified.length > 150 ? stringified.substring(0, 150) + "..." : stringified;
        return limited;
      }
    } catch {
      // JSON.stringify can fail on circular references
      return "An error occurred (unable to parse error details)";
    }
  }

  // Handle arrays (edge case)
  if (Array.isArray(error)) {
    if (error.length === 0) {
      return "An unknown error occurred";
    }
    // Try to format the first error in the array
    return formatError(error[0]);
  }

  // Handle symbols (very unlikely but complete)
  if (typeof error === "symbol") {
    return "An unexpected error occurred";
  }

  // Handle functions (shouldn't happen but for completeness)
  if (typeof error === "function") {
    return "An unexpected error occurred";
  }

  // Ultimate fallback
  return "An unexpected error occurred";
}
