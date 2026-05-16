/**
 * Ombre unique des panneaux dashboard (définition CSS dans `globals.css`).
 * Toujours en `box-shadow` sur la coque **sans** `overflow-hidden` (sinon clipping).
 */
export const DASHBOARD_PANEL_SHADOW_CLASS = "dashboard-panel-shadow";

/** Survol léger (bandeau profil, etc.). */
export const DASHBOARD_PANEL_SHADOW_HOVER_CLASS = "dashboard-panel-shadow-hover";

/**
 * Clip scroll / coins — sur un bloc **intérieur** sous la coque vitrée.
 * Ne pas combiner avec l’ombre sur le même nœud.
 */
export const DASHBOARD_PANEL_INNER_CLIP_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[inherit]";

/** Chrome partagé des vitres (bordure, blur, rayon). */
export const DASHBOARD_PANEL_CHROME_ROUNDED = "rounded-[24px]";
export const DASHBOARD_PANEL_CHROME_BORDER = "border border-black/[0.06]";
export const DASHBOARD_PANEL_CHROME_BLUR =
  "backdrop-blur-[24px] backdrop-saturate-[180%]";

/**
 * Vitres glass : `overflow-hidden` + coins arrondis coupent les box-shadow des enfants
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
