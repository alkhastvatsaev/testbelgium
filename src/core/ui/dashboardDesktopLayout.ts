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
 * - Colonne centrale : **carré** — côté `min(70dvh, 720px, 100 %)` via `aspect-square` + `max-w-[min(70dvh,720px)]` (même rendu relatif sur 13ʺ et grands écrans).
 * - Marge bas : réserve pour la bande Galaxy fixe (`pb-[calc(5.5rem+env(safe-area-inset-bottom))]`).
 * - Les overlays `fixed` (portails) utilisent `DASHBOARD_DESKTOP_FIXED_RAIL_*` calé sur la gouttière `lg` (48px).
 *
 * Les classes « coque verre » reprennent les ombres / blur / bordures existantes.
 */

/** Aligné en haut ; `pb` évite que le contenu passe sous la bande Galaxy (`AiAssistant`, ~4rem + marge). */
export const DASHBOARD_DESKTOP_ROOT_CLASS =
  "flex h-full min-h-0 w-full items-start justify-center overflow-hidden px-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-3 md:px-8 md:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pt-3 lg:px-12 lg:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pt-4";

/** Piste principale : largeur bornée, colonnes en flex. */
export const DASHBOARD_DESKTOP_TRACK_CLASS =
  "mx-auto flex min-h-0 w-full max-w-[1580px] shrink-0 items-stretch justify-center gap-6 lg:gap-8";

/** Colonne latérale (missions / inbox / rails hub). */
export const DASHBOARD_DESKTOP_SIDE_COL_CLASS = "flex w-[380px] shrink-0 flex-col lg:w-[400px]";

/**
 * Cellule du rail central (flex) : le carré vitré est enfant (`dashboardTripleCenterShellClass` ou carte).
 */
export const DASHBOARD_DESKTOP_CENTER_COL_CLASS =
  "flex min-h-0 min-w-0 max-w-[720px] flex-1 flex-col items-center justify-start";

/**
 * Position `fixed` — bord gauche du rail aligné sur la grille (portails / horloge / transcription).
 * Chaîne complète pour le scanner Tailwind.
 */
export const DASHBOARD_DESKTOP_FIXED_RAIL_LEFT_CLASS =
  "left-[max(1.5rem,calc((100vw-min(1580px,calc(100vw-6rem)))/2+3rem))]";

/** Symétrique pour le bord droit (ex. sélecteur de profil). */
export const DASHBOARD_DESKTOP_FIXED_RAIL_RIGHT_CLASS =
  "right-[max(1.5rem,calc((100vw-min(1580px,calc(100vw-6rem)))/2+3rem))]";

/** Hauteur des rails latéraux = côté du carré central (alignement visuel). */
export const DASHBOARD_DESKTOP_RAIL_HEIGHT_CLASS = "h-[min(70dvh,720px)]";

/** Coque verre — rail latéral (ombre / blur inchangés par rapport à l’historique). */
export const dashboardTripleSideShellClass =
  `flex ${DASHBOARD_DESKTOP_RAIL_HEIGHT_CLASS} min-h-0 w-full flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white/72 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_24px_56px_-22px_rgba(15,23,42,0.08)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500`;

/** Coque verre — colonne centrale carrée (léger halo bleu conservé). */
export const dashboardTripleCenterShellClass =
  "flex w-full max-w-[min(70dvh,720px)] shrink-0 aspect-square min-h-0 min-w-0 flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white/76 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_28px_58px_-22px_rgba(15,23,42,0.08),0_0_80px_rgba(59,130,246,0.09)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500";

/** Colonne droite carte (inbox / suivi) — teinte bleue conservée. */
export const dashboardMapRightShellClass =
  `flex ${DASHBOARD_DESKTOP_RAIL_HEIGHT_CLASS} min-h-0 w-full flex-col overflow-hidden rounded-[24px] border border-blue-400/20 bg-white/70 shadow-[0_0_60px_-15px_rgba(59,130,246,0.3),0_24px_56px_-22px_rgba(15,23,42,0.08)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500`;

/** Carte : même géométrie carrée que le hub (ombres carte inchangées). */
export const dashboardMapCenterSquareClass =
  "relative z-0 w-full max-w-[min(70dvh,720px)] shrink-0 aspect-square min-h-0 min-w-0 overflow-hidden rounded-[24px] border border-black/[0.06] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1),0_32px_64px_-24px_rgba(15,23,42,0.07),0_0_100px_rgba(59,130,246,0.1)] transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]";
