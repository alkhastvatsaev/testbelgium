/**
 * Glass panel chrome — TypeScript surface for `panel-tokens.css`.
 *
 * Use `.panel-glass` on every shell (via `glassPanelShellClass()` or `<GlassPanel />`).
 * Scroll clip only on `[data-glass-panel-inner]`.
 */

export const PANEL_CSS_VAR = {
  shadow: "--panel-shadow",
  shadowHover: "--panel-shadow-hover",
  dashboardShadow: "--dashboard-panel-shadow",
} as const;

/** Canonical glass shell class */
export const PANEL_GLASS_CLASS = "panel-glass";

export const PANEL_GLASS_BLUR_CLASS = "panel-glass--blur";

export const PANEL_SHADOW_CLASS = "panel-shadow";

/** @deprecated Use PANEL_GLASS_CLASS */
export const DASHBOARD_PANEL_SHADOW_CLASS = PANEL_SHADOW_CLASS;

export const PANEL_SHADOW_HOVER_CLASS = "panel-glass-hover";

/** @deprecated */
export const DASHBOARD_PANEL_SHADOW_HOVER_CLASS = PANEL_SHADOW_HOVER_CLASS;

export const PANEL_GLASS_DATA_ATTR = "data-glass-panel" as const;
export const PANEL_GLASS_INNER_DATA_ATTR = "data-glass-panel-inner" as const;
export const PANEL_SHADOW_HOVER_DATA_ATTR = "data-panel-shadow-hover" as const;

export const DASHBOARD_PANEL_INNER_CLIP_CLASS =
  "panel-glass-inner flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[inherit]";

/** @deprecated Prefer PANEL_GLASS_CLASS */
export const DASHBOARD_PANEL_CHROME_ROUNDED = "rounded-[24px]";
export const DASHBOARD_PANEL_CHROME_BORDER = "border border-black/[0.06]";
export const DASHBOARD_PANEL_CHROME_BLUR = PANEL_GLASS_BLUR_CLASS;

export type GlassPanelShellOptions = {
  bg?: string;
  heightClass?: string;
  layoutClass?: string;
  blur?: boolean;
  shadowHover?: boolean;
  extra?: string;
};

export function glassPanelShellClass({
  bg = "bg-white/72",
  heightClass = "",
  layoutClass = "flex min-h-0 w-full max-w-full flex-col",
  blur = true,
  shadowHover = false,
  extra = "",
}: GlassPanelShellOptions = {}): string {
  return [
    layoutClass,
    heightClass,
    PANEL_GLASS_CLASS,
    bg,
    blur ? PANEL_GLASS_BLUR_CLASS : "",
    shadowHover ? PANEL_SHADOW_HOVER_CLASS : "",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export const GLASS_PANEL_BODY_SCROLL =
  "custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 pb-6";

export const GLASS_PANEL_BODY_SCROLL_COMPACT =
  "custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-5";

export const GLASS_PANEL_OVERFLOW_PADDING =
  "custom-scrollbar overflow-x-hidden overflow-y-auto px-4 py-4 pb-5";

export const GLASS_PANEL_BODY_SCROLL_WIDE =
  "custom-scrollbar min-h-0 max-h-[min(90vh,560px)] overflow-x-hidden overflow-y-auto px-8 py-8 pb-10";
