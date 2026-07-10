function isMac() {
  return typeof window !== "undefined" && window.navigator.userAgent.includes("Mac");
}

export function getModifierKey() {
  return isMac() ? "⌘" : "Ctrl";
}
