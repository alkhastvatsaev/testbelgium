"use client";

import { useLayoutEffect, useState } from "react";
import { AI_STRIP_EDGE_INSET_PX, getAiStripAnchorEl } from "@/features/dispatch/aiStripAnchor";

export type AiStripInsetRect = { left: number; width: number };


export function useAiStripInsetRect(): AiStripInsetRect | null {
  const [mapPanelRect, setMapPanelRect] = useState<AiStripInsetRect | null>(null);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;

    const read = () => {
      const anchor = getAiStripAnchorEl();
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      if (r.width >= 1) {
        const inset = AI_STRIP_EDGE_INSET_PX;
        setMapPanelRect({
          left: Math.round(r.left) + inset,
          width: Math.max(0, Math.round(r.width) - inset * 2),
        });
      }
    };
    read();

    const ro = new ResizeObserver(() => read());
    const spotlight = document.getElementById("spotlight-search");
    const mapPanel = document.getElementById("map-container");
    if (spotlight) ro.observe(spotlight);
    if (mapPanel) ro.observe(mapPanel);

    window.addEventListener("resize", read);
    window.addEventListener("scroll", read, true);
    window.visualViewport?.addEventListener("resize", read);
    window.visualViewport?.addEventListener("scroll", read);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", read);
      window.removeEventListener("scroll", read, true);
      window.visualViewport?.removeEventListener("resize", read);
      window.visualViewport?.removeEventListener("scroll", read);
    };
  }, []);

  return mapPanelRect;
}
