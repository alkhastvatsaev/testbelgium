import { DASHBOARD_GRID_GAP_PX, DASHBOARD_GALAXY_BAND_HEIGHT_PX } from "@/core/ui/dashboardDesktopLayout";

/**
 * Inset horizontal de la bande Galaxy dans la colonne centre.
 * 0 = pleine largeur du panneau carte (comme les vitres), pas de marge supplémentaire.
 */
export const AI_STRIP_EDGE_INSET_PX = 0;

/** Miroir de `--dashboard-galaxy-bottom-offset` (= `--dashboard-grid-gap`). */
export const AI_STRIP_BOTTOM_OFFSET_PX = DASHBOARD_GRID_GAP_PX;

/** Miroir de `--dashboard-galaxy-band-height`. */
export const AI_STRIP_BAR_HEIGHT_PX = DASHBOARD_GALAXY_BAND_HEIGHT_PX;

/**
 * Élément d’ancrage pour la largeur/position de la bande Galaxy.
 * Priorité : `#map-container` (colonne centre) pour le même gabarit que les panels.
 */
export function getAiStripAnchorEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const layout = document.querySelector(".dashboard-layout");
  const mapEl = document.getElementById("map-container");
  const isHud = layout?.classList.contains("mode-hud") === true;
  if (isHud && mapEl) return mapEl;
  if (mapEl) return mapEl;
  return document.getElementById("spotlight-search");
}
