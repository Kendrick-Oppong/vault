export function clampPositionToViewport(el: HTMLElement, pos: { x: number; y: number }) {
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const rect = el.getBoundingClientRect();
  const naturalLeft = rect.left - pos.x;
  const naturalTop = rect.top - pos.y;

  const maxLeft = Math.max(0, vw - width);
  const maxTop = Math.max(0, vh - height);

  const clampedLeft = Math.min(Math.max(naturalLeft + pos.x, 0), maxLeft);
  const clampedTop = Math.min(Math.max(naturalTop + pos.y, 0), maxTop);

  return { x: clampedLeft - naturalLeft, y: clampedTop - naturalTop };
}
