/**
 * Dashboard desktop layout — TypeScript surface (classes + numeric constants).
 *
 * **Rail system** (see `dashboard-layout.css`):
 * - Rail 1–4: edges of left / center / right columns in `.dashboard-desktop-grid`
 * - Header + pager pages use the same grid
 * - Galaxy bar: `grid-column: 2` only (same width as `#map-container`, between Rail 2–3)
 *
 * CSS source of truth: `src/app/dashboard-layout.css`
 * Panel chrome: `panel-tokens.css` + `glassPanelChrome.ts`
 */

import { glassPanelShellClass } from "@/core/ui/glassPanelChrome";

export {
  DASHBOARD_PANEL_INNER_CLIP_CLASS,
  DASHBOARD_PANEL_SHADOW_CLASS,
  DASHBOARD_PANEL_SHADOW_HOVER_CLASS,
  PANEL_CSS_VAR,
  PANEL_GLASS_CLASS,
  PANEL_SHADOW_CLASS,
  glassPanelShellClass,
} from "@/core/ui/glassPanelChrome";

/* ── Numeric mirrors (keep in sync with dashboard-layout.css :root) ── */

export const DASHBOARD_RAIL_MIN_WIDTH_PX = 320;

/** @deprecated */
export const DASHBOARD_PANEL_MIN_WIDTH_PX = DASHBOARD_RAIL_MIN_WIDTH_PX;

/** @deprecated */
export const DASHBOARD_PANEL_MAX_WIDTH_PX = DASHBOARD_RAIL_MIN_WIDTH_PX;

/** @deprecated */
export const DASHBOARD_RAIL_MAX_WIDTH_PX = DASHBOARD_RAIL_MIN_WIDTH_PX;

export const DASHBOARD_CENTER_MIN_WIDTH_PX = 500;

export const DASHBOARD_STACK_MAX_WIDTH_PX = 1480;

/** @deprecated */
export const DASHBOARD_CANVAS_MAX_WIDTH_PX = DASHBOARD_STACK_MAX_WIDTH_PX;

/** gap-6 = 1.5rem */
export const DASHBOARD_GRID_GAP_PX = 24;

export const DASHBOARD_GALAXY_BAND_HEIGHT_PX = 56;

/** @deprecated */
export const DASHBOARD_GUTTER_PX = DASHBOARD_GRID_GAP_PX;

export const DASHBOARD_HEADER_HEIGHT_PX = 70;

export const DASHBOARD_VIEWPORT_MIN_WIDTH_PX = 768;

export const DASHBOARD_TRACK_MIN_WIDTH_PX =
  DASHBOARD_RAIL_MIN_WIDTH_PX * 2 +
  DASHBOARD_CENTER_MIN_WIDTH_PX +
  DASHBOARD_GRID_GAP_PX * 2;

/** @deprecated */
export const DASHBOARD_CANVAS_MIN_WIDTH_PX = DASHBOARD_TRACK_MIN_WIDTH_PX;

export const DASHBOARD_CSS_VAR = {
  railMin: "--dashboard-rail-min-width",
  centerMin: "--dashboard-center-min-width",
  panelMin: "--dashboard-panel-min-width",
  panelMax: "--dashboard-panel-max-width",
  stackMax: "--dashboard-stack-max-width",
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
} as const;

/* ── Layout class names ── */

export const DASHBOARD_DESKTOP_APP_SHELL_CLASS = "dashboard-desktop-app";

export const DASHBOARD_DESKTOP_CANVAS_CLASS = "dashboard-desktop-canvas";

export const DASHBOARD_DESKTOP_STACK_CLASS = "dashboard-desktop-stack";

export const DASHBOARD_DESKTOP_STACK_HEADER_CLASS = "dashboard-desktop-stack-header";

export const DASHBOARD_DESKTOP_STACK_BODY_CLASS = "dashboard-desktop-stack-body";

export const DASHBOARD_DESKTOP_OVERLAY_ROOT_CLASS = "dashboard-desktop-overlay-root";

/** Same grid template as header/body; chrome is column 2 (map rail). */
export const DASHBOARD_DESKTOP_GALAXY_DOCK_CLASS = "dashboard-desktop-galaxy-dock";

/** Grid column index for map + galaxy (Rail 2 → Rail 3). */
export const DASHBOARD_GALAXY_GRID_COLUMN = 2;

export const DASHBOARD_DESKTOP_GALAXY_DOCK_CHROME_CLASS =
  "dashboard-desktop-galaxy-dock-chrome panel-glass";

/** Primary 3-column grid */
export const DASHBOARD_DESKTOP_GRID_CLASS = "dashboard-desktop-grid";

/** @deprecated Use DASHBOARD_DESKTOP_GRID_CLASS */
export const DASHBOARD_DESKTOP_TRACK_CLASS = DASHBOARD_DESKTOP_GRID_CLASS;

export const DASHBOARD_DESKTOP_GRID_FILL_CLASS = "dashboard-desktop-grid--fill";

/** @deprecated */
export const DASHBOARD_DESKTOP_TRACK_FILL_CLASS = DASHBOARD_DESKTOP_GRID_FILL_CLASS;

export const DASHBOARD_DESKTOP_COL_CLASS = "dashboard-desktop-col";

export const DASHBOARD_DESKTOP_PAGE_ROOT_CLASS = "dashboard-desktop-page-root";

/** @deprecated */
export const DASHBOARD_DESKTOP_ROOT_CLASS = DASHBOARD_DESKTOP_PAGE_ROOT_CLASS;

export const DASHBOARD_DESKTOP_GALAXY_STRIP_CLASS = "dashboard-desktop-galaxy-strip";

export const DASHBOARD_DESKTOP_GALAXY_STRIP_INNER_CLASS = "dashboard-desktop-galaxy-strip-inner";

export const DASHBOARD_DESKTOP_GALAXY_RAIL_CLASS = "dashboard-desktop-galaxy-rail";

export const DASHBOARD_DESKTOP_GALAXY_BOTTOM_CLASS = "bottom-6";

export const DASHBOARD_DESKTOP_GALAXY_INSET_END_CLASS = "right-6";

export const DASHBOARD_DESKTOP_SIDE_COL_CLASS = `dashboard-desktop-col`;

export const DASHBOARD_DESKTOP_CENTER_COL_CLASS = `dashboard-desktop-col`;

export const DASHBOARD_DESKTOP_PANEL_GAP_CLASS = "gap-6";

/** @deprecated */
export const DASHBOARD_DESKTOP_PAGER_OFFSET_CLASS = "";

/** @deprecated */
export const DASHBOARD_DESKTOP_HEADER_WRAPPER_CLASS = DASHBOARD_DESKTOP_STACK_HEADER_CLASS;

/** Rails fill grid row height */
export const DASHBOARD_DESKTOP_RAIL_HEIGHT_CLASS = "h-full min-h-[min(56dvh,680px)] max-h-[min(72dvh,760px)]";

export const dashboardHeaderPanelShellClass = glassPanelShellClass({
  bg: "bg-white/70",
  layoutClass:
    "relative flex h-[var(--dashboard-header-height)] w-full min-w-0 max-w-full flex-col",
  heightClass: "",
  extra: "transition-all duration-300",
});

const dashboardGlassRailShell = (bg: string) =>
  glassPanelShellClass({
    bg,
    heightClass: DASHBOARD_DESKTOP_RAIL_HEIGHT_CLASS,
    extra: "transition-all duration-500",
  });

export const dashboardTripleSideShellClass = dashboardGlassRailShell("bg-white/72");

export const dashboardTripleCenterShellClass = dashboardGlassRailShell("bg-white/76");

export const dashboardMapRightShellClass = dashboardGlassRailShell("bg-white/72");

export const dashboardMapCenterSquareClass = glassPanelShellClass({
  bg: "bg-white/76",
  blur: true,
  layoutClass: "relative flex w-full min-h-0 min-w-0 max-w-full flex-col",
  heightClass: DASHBOARD_DESKTOP_RAIL_HEIGHT_CLASS,
  extra: "transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]",
});
