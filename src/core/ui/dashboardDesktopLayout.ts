/**
 * Layout desktop « triple rail » (hub secondaire + écran carte d’accueil).
 *
 * Ancien système : panneaux en `position: absolute` + `calc(50vw - 35vh - …)` + largeur
 * `70vh`, très sensible au scaling Windows / aux résolutions.
 *
 * Nouveau système :
 * - Conteneur racine : aligné en **haut** (`items-start`) — le `padding-top` du pager réserve déjà la place au bandeau fixe ; éviter `items-center` qui repoussait les vitres vers le bas.
 * - Marges horizontales / bas : `px-*` + `pb-*` ; léger `pt-3` sous le bandeau (le pager a déjà le décalage principal).
 * - Colonnes latérales : largeur fixe en px + `shrink-0`.
 * - Colonne centrale : `flex-1 min-w-0 max-w-[720px]` + `h-[70vh]` (hauteur vitrée inchangée).
 * - Les overlays `fixed` (portails) utilisent `DASHBOARD_DESKTOP_FIXED_RAIL_*` calé sur la gouttière `lg` (48px).
 *
 * Les classes « coque verre » reprennent les ombres / blur / bordures existantes.
 */

/** Aligné en haut : le `DashboardPager` gère déjà l’espace sous le bandeau global fixe. */
export const DASHBOARD_DESKTOP_ROOT_CLASS =
  "flex h-full min-h-0 w-full items-start justify-center overflow-hidden px-6 pb-6 pt-3 md:px-8 md:pb-8 md:pt-3 lg:px-12 lg:pb-12 lg:pt-4";

/** Piste principale : largeur bornée, colonnes en flex. */
export const DASHBOARD_DESKTOP_TRACK_CLASS =
  "mx-auto flex min-h-0 w-full max-w-[1580px] shrink-0 items-stretch justify-center gap-6 lg:gap-8";

/** Colonne latérale (missions / inbox / rails hub). */
export const DASHBOARD_DESKTOP_SIDE_COL_CLASS = "flex w-[380px] shrink-0 flex-col lg:w-[400px]";

/** Colonne centrale (carte ou formulaire large). */
export const DASHBOARD_DESKTOP_CENTER_COL_CLASS =
  "flex h-[70vh] min-h-0 min-w-0 max-w-[720px] flex-1 flex-col";

/**
 * Position `fixed` — bord gauche du rail aligné sur la grille (portails / horloge / transcription).
 * Chaîne complète pour le scanner Tailwind.
 */
export const DASHBOARD_DESKTOP_FIXED_RAIL_LEFT_CLASS =
  "left-[max(1.5rem,calc((100vw-min(1580px,calc(100vw-6rem)))/2+3rem))]";

/** Symétrique pour le bord droit (ex. sélecteur de profil). */
export const DASHBOARD_DESKTOP_FIXED_RAIL_RIGHT_CLASS =
  "right-[max(1.5rem,calc((100vw-min(1580px,calc(100vw-6rem)))/2+3rem))]";

/** Coque verre — rail latéral (ombre / blur inchangés par rapport à l’historique). */
export const dashboardTripleSideShellClass =
  "flex h-[70vh] min-h-0 w-full flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white/72 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_24px_56px_-22px_rgba(15,23,42,0.08)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500";

/** Coque verre — colonne centrale (léger halo bleu conservé). */
export const dashboardTripleCenterShellClass =
  "flex h-[70vh] w-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white/76 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_28px_58px_-22px_rgba(15,23,42,0.08),0_0_80px_rgba(59,130,246,0.09)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500";

/** Colonne droite carte (inbox / suivi) — teinte bleue conservée. */
export const dashboardMapRightShellClass =
  "flex h-[70vh] min-h-0 w-full flex-col overflow-hidden rounded-[24px] border border-blue-400/20 bg-white/70 shadow-[0_0_60px_-15px_rgba(59,130,246,0.3),0_24px_56px_-22px_rgba(15,23,42,0.08)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500";
