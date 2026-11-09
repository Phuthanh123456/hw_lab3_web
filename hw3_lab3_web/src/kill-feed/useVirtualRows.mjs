import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateVirtualRange } from "./kill-feed-model.mjs";

/** Fixed-height virtual window; ResizeObserver keeps the range aligned to its viewport. */
export function useVirtualRows({ itemCount, rowHeight, overscan = 4, initialViewportHeight = 0 }) {
  const scrollRef = useRef(null);
  const [metrics, setMetrics] = useState({ scrollTop: 0, viewportHeight: initialViewportHeight });

  const measure = useCallback((element) => {
    if (!element) return;
    const maxScrollTop = Math.max(0, itemCount * rowHeight - element.clientHeight);
    const scrollTop = Math.min(Math.max(0, element.scrollTop), maxScrollTop);
    if (scrollTop !== element.scrollTop) element.scrollTop = scrollTop;
    const next = { scrollTop, viewportHeight: element.clientHeight };
    setMetrics((current) => current.scrollTop === next.scrollTop
      && current.viewportHeight === next.viewportHeight ? current : next);
  }, [itemCount, rowHeight]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;
    const onScroll = () => measure(element);
    element.addEventListener("scroll", onScroll, { passive: true });
    measure(element);

    let observer;
    if (typeof globalThis.ResizeObserver === "function") {
      observer = new globalThis.ResizeObserver(() => measure(element));
      observer.observe(element);
    } else {
      globalThis.addEventListener?.("resize", onScroll);
    }

    return () => {
      element.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      if (!observer) globalThis.removeEventListener?.("resize", onScroll);
    };
  }, [measure]);

  const range = useMemo(() => calculateVirtualRange({
    itemCount,
    scrollTop: metrics.scrollTop,
    viewportHeight: metrics.viewportHeight,
    rowHeight,
    overscan,
  }), [itemCount, metrics.scrollTop, metrics.viewportHeight, rowHeight, overscan]);

  return { scrollRef, range };
}
