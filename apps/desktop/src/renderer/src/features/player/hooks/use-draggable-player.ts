import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { usePlayerStore } from "@/stores/player/player.store";
import { clampPositionToViewport } from "../lib/utils";

export function useDraggablePlayer(
  playerRef: React.RefObject<HTMLElement | null>,
  isExpanded: boolean,
  isPiP: boolean
) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [pointerActive, setPointerActive] = useState(false);

  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartRect = useRef({ left: 0, top: 0 });
  const draggingRef = useRef(false);
  const dragMoved = useRef(false);
  const suppressClick = useRef(false);

  useEffect(() => {
    if (!pointerActive) return;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartMouse.current.x;
      const dy = e.clientY - dragStartMouse.current.y;

      if (!draggingRef.current && Math.hypot(dx, dy) > 4) {
        draggingRef.current = true;
        dragMoved.current = true;
        setIsDragging(true);
      }

      if (draggingRef.current) {
        const el = playerRef.current;
        if (!el) {
          setPosition({ x: dragStartPos.current.x + dx, y: dragStartPos.current.y + dy });
          return;
        }

        const width = el.offsetWidth;
        const height = el.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Where the top-left corner would land without clamping.
        const desiredLeft = dragStartRect.current.left + dx;
        const desiredTop = dragStartRect.current.top + dy;

        const maxLeft = Math.max(0, vw - width);
        const maxTop = Math.max(0, vh - height);

        const clampedLeft = Math.min(Math.max(desiredLeft, 0), maxLeft);
        const clampedTop = Math.min(Math.max(desiredTop, 0), maxTop);

        // Convert the clamped top-left back into a translate offset.
        const naturalLeft = dragStartRect.current.left - dragStartPos.current.x;
        const naturalTop = dragStartRect.current.top - dragStartPos.current.y;

        setPosition({ x: clampedLeft - naturalLeft, y: clampedTop - naturalTop });
      }
    };

    const onUp = () => {
      if (dragMoved.current) {
        suppressClick.current = true;
        setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }

      draggingRef.current = false;
      dragMoved.current = false;
      setIsDragging(false);
      setPointerActive(false);
    };

    globalThis.addEventListener("mousemove", onMove);
    globalThis.addEventListener("mouseup", onUp);

    return () => {
      globalThis.removeEventListener("mousemove", onMove);
      globalThis.removeEventListener("mouseup", onUp);
    };
  }, [pointerActive, playerRef]);

  // Keep the player on screen if the window is resized or the width changes.
  useEffect(() => {
    const onResize = () => {
      const el = playerRef.current;
      if (!el || usePlayerStore.getState().isExpanded) return;
      setPosition((prev) => clampPositionToViewport(el, prev));
    };

    globalThis.addEventListener("resize", onResize);
    return () => globalThis.removeEventListener("resize", onResize);
  }, [playerRef]);

  useEffect(() => {
    const el = playerRef.current;
    if (!el || isExpanded) return;
    setPosition((prev) => clampPositionToViewport(el, prev));
  }, [isPiP, isExpanded, playerRef]);

  const handleMouseDown = (e: ReactMouseEvent) => {
    if (isExpanded) return;

    if ((e.target as HTMLElement).closest("button, [role=slider], input, a, .js-no-drag")) {
      return;
    }

    const el = playerRef.current;
    if (el) {
      // Captured while scale === 1 so it's an accurate anchor for clamping.
      const rect = el.getBoundingClientRect();
      dragStartRect.current = { left: rect.left, top: rect.top };
    }

    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { ...position };
    draggingRef.current = false;
    dragMoved.current = false;
    setPointerActive(true);
  };

  return { position, isDragging, suppressClickRef: suppressClick, handleMouseDown };
}
