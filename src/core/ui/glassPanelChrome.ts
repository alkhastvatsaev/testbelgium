/**
 * Vitres glass avec `overflow-hidden` + coins arrondis coupent les box-shadow des enfants
 * si le contenu colle aux bords. Utiliser ces classes sur un bloc **intérieur** (scroll / flex-1)
 * sous la coque, pas sur la coque elle-même.
 */
export const GLASS_PANEL_BODY_SCROLL =
  "custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 pb-6";

/** Modales compactes ou barres secondaires. */
export const GLASS_PANEL_BODY_SCROLL_COMPACT =
  "custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-5";

/**
 * Zone scroll avec marges, sans `flex-1` (listes cmdk, blocs à hauteur max fixe).
 */
export const GLASS_PANEL_OVERFLOW_PADDING =
  "custom-scrollbar overflow-x-hidden overflow-y-auto px-4 py-4 pb-5";

/** Carte login / contenu étroit : marges larges, scroll si besoin. */
export const GLASS_PANEL_BODY_SCROLL_WIDE =
  "custom-scrollbar min-h-0 max-h-[min(90vh,560px)] overflow-x-hidden overflow-y-auto px-8 py-8 pb-10";
