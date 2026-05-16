/**
 * Dashboard desktop layout — TypeScript surface (classes + numeric constants).
 *
 * **Layout contract (1A · 2B · 3A · 4A · 5A)**
 * - **1A** — Un seul gap entre cadres vitrés (`--dashboard-grid-gap`).
 * - **2B** — Bandeau → piste : `header + pad-top + gap` (`.dashboard-desktop-pager-offset`).
 * - **3A** — Colonne centre en `1fr` (pleine largeur utile).
 * - **4A** — Stacks internes hubs : `DASHBOARD_DESKTOP_PANEL_GAP_CLASS`.
 * - **5A** — Réserve Galaxy via `.dashboard-desktop-page-root` padding-bottom.
 *
 * **Responsive strategy** (see `src/app/dashboard-layout.css`)
 * - Grid: `minmax(380px, 400px) | minmax(400px, 1fr) | minmax(380px, 400px)`.
 * - Viewport &lt; canvas min-width → horizontal scroll on `.dashboard-desktop-app` (never crush rails).
 * - Grid cells use `.dashboard-desktop-col` + `min-w-0` so content truncates inside columns.
 *
 * All sizing tokens live in CSS (`:root`). Update `dashboard-layout.css` first, then mirror px here for tests.
 */

import {
  DASHBOARD_PANEL_CHROME_BLUR,
  DASHBOARD_PANEL_CHROME_BORDER,
  DASHBOARD_PANEL_CHROME_ROUNDED,
  DASHBOARD_PANEL_INNER_CLIP_CLASS,
  DASHBOARD_PANEL_SHADOW_CLASS,
} from "@/core/ui/glassPanelChrome";

export {
  DASHBOARD_PANEL_INNER_CLIP_CLASS,
  DASHBOARD_PANEL_SHADOW_CLASS,
  DASHBOARD_PANEL_SHADOW_HOVER_CLASS,
} from "@/core/ui/glassPanelChrome";

/* ── Numeric mirrors of CSS custom properties (tests, Storybook, docs) ── */

/** Minimum comfortable width of a side glass panel (px). */
export const DASHBOARD_PANEL_MIN_WIDTH_PX = 380;

/** @deprecated Use DASHBOARD_PANEL_MIN_WIDTH_PX */
export const DASHBOARD_RAIL_MIN_WIDTH_PX = DASHBOARD_PANEL_MIN_WIDTH_PX;

/** Maximum side panel width before centre takes priority (px). */
export const DASHBOARD_PANEL_MAX_WIDTH_PX = 400;

/** @deprecated Use DASHBOARD_PANEL_MAX_WIDTH_PX */
export const DASHBOARD_RAIL_MAX_WIDTH_PX = DASHBOARD_PANEL_MAX_WIDTH_PX;

/** Minimum width of the centre column (map / hub) (px). */
export const DASHBOARD_CENTER_MIN_WIDTH_PX = 400;

/** Max content width of the 3-column track (px). */
export const DASHBOARD_CANVAS_MAX_WIDTH_PX = 1580;

/** Grid gap between columns (px) — sync with `--dashboard-grid-gap` (1.5rem). */
export const DASHBOARD_GRID_GAP_PX = 24;

/** Galaxy bar height (px) — sync with `--dashboard-galaxy-band-height` (3.5rem). */
export const DASHBOARD_GALAXY_BAND_HEIGHT_PX = 56;

/** @deprecated Use DASHBOARD_GRID_GAP_PX */
export const DASHBOARD_GUTTER_PX = DASHBOARD_GRID_GAP_PX;

/** Global header band height (px) — sync with `--dashboard-header-height`. */
export const DASHBOARD_HEADER_HEIGHT_PX = 70;

/** Minimum supported viewport width for desktop dashboard (px). */
export const DASHBOARD_VIEWPORT_MIN_WIDTH_PX = 768;

/**
 * Track min-width without page padding: 2×380 + 400 + 2×24 = 1208px.
 * Below this, `.dashboard-desktop-app` enables horizontal scroll.
 */
export const DASHBOARD_TRACK_MIN_WIDTH_PX =
  DASHBOARD_PANEL_MIN_WIDTH_PX * 2 +
  DASHBOARD_CENTER_MIN_WIDTH_PX +
  DASHBOARD_GRID_GAP_PX * 2;

/** @deprecated Use DASHBOARD_TRACK_MIN_WIDTH_PX */
export const DASHBOARD_CANVAS_MIN_WIDTH_PX = DASHBOARD_TRACK_MIN_WIDTH_PX;

/** CSS custom property names — single source of truth for var() references. */
export const DASHBOARD_CSS_VAR = {
  panelMin: "--dashboard-panel-min-width",
  panelMax: "--dashboard-panel-max-width",
  railMin: "--dashboard-rail-min-width",
  railMax: "--dashboard-rail-max-width",
  centerMin: "--dashboard-center-min-width",
  canvasMax: "--dashboard-canvas-max-width",
  canvasMin: "--dashboard-canvas-min-width",
  trackMin: "--dashboard-track-min-width",
  canvasPadX: "--dashboard-canvas-pad-x",
  canvasPadTop: "--dashboard-canvas-pad-top",
  gridGap: "--dashboard-grid-gap",
  gutter: "--dashboard-gutter",
  gridColumns: "--dashboard-grid-columns",
  headerHeight: "--dashboard-header-height",
  galaxyBandHeight: "--dashboard-galaxy-band-height",
  galaxyBottomOffset: "--dashboard-galaxy-bottom-offset",
} as const;

/* ── Layout class names (defined in dashboard-layout.css) ── */

/** Horizontal scroll host wrapping header + pager. */
export const DASHBOARD_DESKTOP_APP_SHELL_CLASS =
  "dashboard-desktop-app relative flex h-[100dvh] w-full flex-col";

/** Min-width canvas; header and pager are siblings inside. */
export const DASHBOARD_DESKTOP_CANVAS_CLASS = "dashboard-desktop-canvas flex min-h-0 flex-col";

/** 3-column responsive grid (bandeau + piste). */
export const DASHBOARD_DESKTOP_TRACK_CLASS = "dashboard-desktop-track";

/** Grid column cell — enables truncation inside minmax columns. */
export const DASHBOARD_DESKTOP_COL_CLASS = "dashboard-desktop-col";

/** Horizontal padding aligned with track (token-driven). */
export const DASHBOARD_DESKTOP_CANVAS_PAD_X_CLASS = "dashboard-desktop-canvas-pad-x";

/** Top padding for header band (token-driven). */
export const DASHBOARD_DESKTOP_CANVAS_PAD_TOP_CLASS = "dashboard-desktop-canvas-pad-top";

/** Stacks inside hub rails — same gap as grid (4A). */
export const DASHBOARD_DESKTOP_PANEL_GAP_CLASS = "gap-6";

/** @deprecated Use DASHBOARD_GRID_GAP_PX / CSS var */
export const DASHBOARD_DESKTOP_GUTTER_REM = "1.5rem";

/** Page content root inside pager (pad-x + Galaxy reserve 5A). */
export const DASHBOARD_DESKTOP_PAGE_ROOT_CLASS = "dashboard-desktop-page-root";

/** @deprecated Use DASHBOARD_DESKTOP_PAGE_ROOT_CLASS */
export const DASHBOARD_DESKTOP_ROOT_CLASS = DASHBOARD_DESKTOP_PAGE_ROOT_CLASS;

/** @deprecated Padding now on DASHBOARD_DESKTOP_PAGE_ROOT_CLASS */
export const DASHBOARD_DESKTOP_GALAXY_RESERVE_PB_CLASS = "";

/** Bande Galaxy (AiAssistant) — offset + hauteur tokenisés. */
export const DASHBOARD_DESKTOP_GALAXY_STRIP_CLASS = "dashboard-desktop-galaxy-strip";

export const DASHBOARD_DESKTOP_GALAXY_STRIP_INNER_CLASS = "dashboard-desktop-galaxy-strip-inner";

/** Overlays bas (transcription, historique). */
export const DASHBOARD_DESKTOP_GALAXY_RAIL_CLASS = "dashboard-desktop-galaxy-rail";

/** Offset bas utilisable en Tailwind arbitraire (carte, contrôles). */
export const DASHBOARD_DESKTOP_GALAXY_BOTTOM_CLASS =
  "bottom-[var(--dashboard-galaxy-bottom-offset)]";

/** Même gutter à droite (ex. bouton recentrer carte). */
export const DASHBOARD_DESKTOP_GALAXY_INSET_END_CLASS =
  "right-[var(--dashboard-galaxy-bottom-offset)]";

export const DASHBOARD_DESKTOP_SIDE_COL_CLASS =
  `flex min-h-0 w-full flex-col ${DASHBOARD_DESKTOP_COL_CLASS}`;

export const DASHBOARD_DESKTOP_CENTER_COL_CLASS =
  `flex min-h-0 w-full flex-col items-stretch justify-start ${DASHBOARD_DESKTOP_COL_CLASS}`;

export const DASHBOARD_DESKTOP_HEADER_WRAPPER_CLASS =
  `pointer-events-none absolute inset-x-0 top-0 z-[100] flex justify-center ${DASHBOARD_DESKTOP_CANVAS_PAD_X_CLASS} ${DASHBOARD_DESKTOP_CANVAS_PAD_TOP_CLASS}`;

/** Pager top offset — clears header + pad + gutter (2B). */
export const DASHBOARD_DESKTOP_PAGER_OFFSET_CLASS = "dashboard-desktop-pager-offset";

/** @deprecated Use DASHBOARD_DESKTOP_PAGER_OFFSET_CLASS */
export const DASHBOARD_DESKTOP_PAGER_TOP_FOR_HEADER = DASHBOARD_DESKTOP_PAGER_OFFSET_CLASS;

export const DASHBOARD_DESKTOP_RAIL_HEIGHT_CLASS = "h-[min(70dvh,720px)]";

export const dashboardHeaderPanelShellClass =
  `relative z-[1] flex h-[var(--dashboard-header-height)] w-full min-w-0 max-w-full flex-col ${DASHBOARD_PANEL_CHROME_ROUNDED} ${DASHBOARD_PANEL_CHROME_BORDER} ${DASHBOARD_PANEL_SHADOW_CLASS} ${DASHBOARD_PANEL_CHROME_BLUR} transition-all duration-300`;

const dashboardGlassRailShell = (bg: string) =>
  `flex ${DASHBOARD_DESKTOP_RAIL_HEIGHT_CLASS} min-h-0 w-full max-w-full flex-col ${DASHBOARD_PANEL_CHROME_ROUNDED} ${DASHBOARD_PANEL_CHROME_BORDER} ${bg} ${DASHBOARD_PANEL_SHADOW_CLASS} ${DASHBOARD_PANEL_CHROME_BLUR} transition-all duration-500`;

export const dashboardTripleSideShellClass = dashboardGlassRailShell("bg-white/72");

export const dashboardTripleCenterShellClass = dashboardGlassRailShell("bg-white/76");

export const dashboardMapRightShellClass = dashboardGlassRailShell("bg-white/72");

export const dashboardMapCenterSquareClass =
  `relative z-0 flex w-full min-h-0 min-w-0 max-w-full flex-col ${DASHBOARD_PANEL_CHROME_ROUNDED} ${DASHBOARD_PANEL_CHROME_BORDER} ${DASHBOARD_PANEL_SHADOW_CLASS} transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${DASHBOARD_DESKTOP_RAIL_HEIGHT_CLASS}`;
