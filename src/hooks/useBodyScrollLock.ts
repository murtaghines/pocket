import { useEffect, useRef } from "react";

/**
 * Locks background page scroll while `active` is true.
 *
 * Plain `overflow: hidden` on <body> isn't enough on iOS Safari — focusing an
 * input still lets the browser scroll the underlying page to bring it into
 * view, which reads as "everything jumps" behind a fixed-position sheet. The
 * position:fixed technique pins the body in place so the keyboard opens over
 * the sheet without moving the page underneath.
 */
export function useBodyScrollLock(active: boolean) {
  const scrollY = useRef(0);

  useEffect(() => {
    if (!active) return;
    scrollY.current = window.scrollY;
    const { style } = document.body;
    style.position = "fixed";
    style.top = `-${scrollY.current}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
    return () => {
      style.position = "";
      style.top = "";
      style.left = "";
      style.right = "";
      style.width = "";
      window.scrollTo(0, scrollY.current);
    };
  }, [active]);
}
