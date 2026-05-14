
export const AI_STRIP_EDGE_INSET_PX = 5;


/** Marge au bord bas de l’écran pour la bande Galaxy (alignée sur `bottom-4` Tailwind ≈ 16px). */
export const AI_STRIP_BOTTOM_OFFSET_PX = 16;


export const AI_STRIP_BAR_HEIGHT_PX = 56;


export function getAiStripAnchorEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const layout = document.querySelector(".dashboard-layout");
  const mapEl = document.getElementById("map-container");
  const spotlightEl = document.getElementById("spotlight-search");
  const isHud = layout?.classList.contains("mode-hud") === true;
  if (isHud && mapEl) return mapEl;
  if (spotlightEl) return spotlightEl;
  return mapEl;
}
