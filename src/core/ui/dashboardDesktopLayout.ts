/**
 * Layout desktop « triple rail » (hub secondaire + écran carte d’accueil).
 *
 * **Lignes directrices (concordance)** — même logique partout :
 * - Une **grille 3 colonnes** identique pour le bandeau fixe (`page.tsx`) et la piste (`MapboxView`, `DashboardTriplePanelLayout`) :
 *   rails `380px` → `400px` (`lg`) · centre `1fr` (Spotlight / carré / Galaxy alignés sur la même verticale).
 * - **Espacement inter-panneaux (équidistance)** : `DASHBOARD_DESKTOP_PANEL_GAP_CLASS` — une seule valeur pour tous les
 *   interstices gauche–centre et centre–droite (propriété CSS `gap` sur la grille) ; pas de `gap` différent en `lg`
 *   pour que le pas reste identique sur toute la plage desktop. Les stacks à l’intérieur des rails (hubs) réutilisent
 *   la même classe pour garder le même rythme visuel.
 * - **Marges page** : `px-6 md:px-8 lg:px-12` alignées sur le `p-*` du bandeau fixe (bords gauche/droit communs).
 * - **Haut** : `DASHBOARD_DESKTOP_PAGER_TOP_FOR_HEADER` = hauteur bandeau (70px + padding vertical du wrapper fixe) pour que le haut des vitres épouse le bas du bandeau.
 * - **Bas** : `pb` racine réserve la bande Galaxy ; côté du carré central = `min(70dvh, 720px)`.
 *
 * Les coques verre gardent ombres / blur / bordures existantes.
 */

/** Largeur max commune : carré central · barre Spotlight (même « colonne » visuelle). */
export const DASHBOARD_DESKTOP_CENTER_MAX_W_CLASS = "max-w-[min(70dvh,720px)]";

/** Même `px` que le bandeau fixe — bords verticaux du canevas alignés. */
export const DASHBOARD_DESKTOP_CANVAS_PAD_X_CLASS = "px-6 md:px-8 lg:px-12";

/**
 * Pas unique entre panneaux vitrés (grille 3 col + colonnes empilées en `grid-cols-1`).
 * `gap` assure gauche–centre = centre–droite ; une valeur pour tous les breakpoints desktop.
 */
export const DASHBOARD_DESKTOP_PANEL_GAP_CLASS = "gap-6";

/**
 * Grille 3 colonnes — **à réutiliser** pour le bandeau et la piste (lignes directrices concordantes).
 * `minmax(0,1fr)` évite le débordement du rail central (carré + contenu).
 */
export const DASHBOARD_DESKTOP_TRACK_CLASS =
  "mx-auto grid w-full min-h-0 max-w-[1580px] grid-cols-1 items-start md:grid-cols-[380px_minmax(0,1fr)_380px] lg:grid-cols-[400px_minmax(0,1fr)_400px] " +
  DASHBOARD_DESKTOP_PANEL_GAP_CLASS;

/** Aligné en haut ; pas de `pt` ici (le pager aligne le premier pixel utile sous le bandeau). Réserve bas = Galaxy. */
export const DASHBOARD_DESKTOP_ROOT_CLASS =
  `flex h-full min-h-0 w-full items-start justify-center overflow-hidden ${DASHBOARD_DESKTOP_CANVAS_PAD_X_CLASS} pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`;

/** Colonne latérale dans la grille : largeur imposée par la piste, pas de `w` fixe en double. */
export const DASHBOARD_DESKTOP_SIDE_COL_CLASS = "flex min-w-0 w-full flex-col";

/**
 * Cellule centrale de la grille : centre le carré / la carte sur la colonne `1fr`
 * (même axe que Spotlight dans le bandeau).
 */
export const DASHBOARD_DESKTOP_CENTER_COL_CLASS =
  "flex min-h-0 min-w-0 w-full flex-col items-center justify-start";

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
  `flex w-full ${DASHBOARD_DESKTOP_CENTER_MAX_W_CLASS} shrink-0 aspect-square min-h-0 min-w-0 flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white/76 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_28px_58px_-22px_rgba(15,23,42,0.08),0_0_80px_rgba(59,130,246,0.09)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500`;

/** Colonne droite carte (inbox / suivi) — teinte bleue conservée. */
export const dashboardMapRightShellClass =
  `flex ${DASHBOARD_DESKTOP_RAIL_HEIGHT_CLASS} min-h-0 w-full flex-col overflow-hidden rounded-[24px] border border-blue-400/20 bg-white/70 shadow-[0_0_60px_-15px_rgba(59,130,246,0.3),0_24px_56px_-22px_rgba(15,23,42,0.08)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500`;

/** Carte : même géométrie carrée que le hub (ombres carte inchangées). */
export const dashboardMapCenterSquareClass =
  `relative z-0 w-full ${DASHBOARD_DESKTOP_CENTER_MAX_W_CLASS} shrink-0 aspect-square min-h-0 min-w-0 overflow-hidden rounded-[24px] border border-black/[0.06] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1),0_32px_64px_-24px_rgba(15,23,42,0.07),0_0_100px_rgba(59,130,246,0.1)] transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]`;

/**
 * Espace réservé sous le bandeau fixe = **70px** (hauteur widgets) + **padding vertical** du wrapper
 * (`p-6` → 3rem, `md:p-8` → 4rem, `lg:p-12` → 6rem), identique à `page.tsx`.
 */
export const DASHBOARD_DESKTOP_PAGER_TOP_FOR_HEADER =
  "pt-[calc(70px+3rem)] md:pt-[calc(70px+4rem)] lg:pt-[calc(70px+6rem)]";
