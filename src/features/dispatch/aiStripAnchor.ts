/**
 * Marge horizontale (en px) appliquée **des deux côtés** entre le repère géométrique
 * (`#spotlight-search`, ou `#map-container` en mode HUD) et le bandeau Galaxy en `fixed`.
 *
 * **Valeur figée** après calage visuel sur la carte (overlay 5 px + 5 px). Ne pas la modifier
 * sans revérifier l’alignement sur la carte / la barre Rechercher.
 */
export const AI_STRIP_EDGE_INSET_PX = 5;

/** Sync avec le bandeau AiAssistant : classe `bottom-10` (2.5rem). */
export const AI_STRIP_BOTTOM_OFFSET_PX = 40;

/** Sync avec la rangée Galaxy dans AiAssistant : `h-14` (3.5rem). */
export const AI_STRIP_BAR_HEIGHT_PX = 56;

/**
 * Référence largeur + position du bandeau : même logique que la barre Rechercher
 * (`#spotlight-search`). En HUD, la carte est plein écran → `#map-container`.
 */
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
