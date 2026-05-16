"use client";

import type { ReactNode } from "react";
import {
  DASHBOARD_DESKTOP_COL_CLASS,
  DASHBOARD_DESKTOP_GRID_CLASS,
  DASHBOARD_DESKTOP_GRID_FILL_CLASS,
  DASHBOARD_DESKTOP_ROOT_CLASS,
  dashboardTripleCenterShellClass,
  dashboardTripleSideShellClass,
} from "@/core/ui/dashboardDesktopLayout";
import GlassPanel from "@/core/ui/GlassPanel";
import { GLASS_PANEL_BODY_SCROLL } from "@/core/ui/glassPanelChrome";

export {
  dashboardTripleSideShellClass,
  dashboardTripleCenterShellClass,
} from "@/core/ui/dashboardDesktopLayout";

export function DashboardTriplePanelSidePlaceholder() {
  return <div aria-label="Zone vide" className="flex-1 bg-transparent" />;
}

type Props = {
  rootTestId?: string;
  leftTestId?: string;
  centerTestId?: string;
  rightTestId?: string;
  leftAriaLabel?: string;
  centerAriaLabel?: string;
  rightAriaLabel?: string;
  center?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  centerPadding?: boolean;
  rightPadding?: boolean;
};

/** 3-column grid page — each rail is a direct grid child + `panel-glass` shell. */
export default function DashboardTriplePanelLayout({
  rootTestId,
  leftTestId,
  centerTestId,
  rightTestId,
  leftAriaLabel = "Panneau gauche",
  centerAriaLabel = "Zone centrale",
  rightAriaLabel = "Panneau droit",
  center,
  left,
  right,
  centerPadding = true,
  rightPadding = true,
}: Props) {
  return (
    <div data-testid={rootTestId} className={DASHBOARD_DESKTOP_ROOT_CLASS}>
      <div className={`${DASHBOARD_DESKTOP_GRID_CLASS} ${DASHBOARD_DESKTOP_GRID_FILL_CLASS}`}>
        <GlassPanel
          as="section"
          aria-label={leftAriaLabel}
          data-testid={leftTestId}
          className={`${DASHBOARD_DESKTOP_COL_CLASS} dashboard-desktop-col--left`}
          shellClassName={dashboardTripleSideShellClass}
          innerClassName={`${GLASS_PANEL_BODY_SCROLL} flex min-h-0 flex-col`}
        >
          {left ?? <DashboardTriplePanelSidePlaceholder />}
        </GlassPanel>

        <GlassPanel
          as="section"
          aria-label={centerAriaLabel}
          data-testid={centerTestId}
          className={`${DASHBOARD_DESKTOP_COL_CLASS} dashboard-desktop-col--center`}
          shellClassName={dashboardTripleCenterShellClass}
          innerClassName={
            centerPadding
              ? `${GLASS_PANEL_BODY_SCROLL} flex min-h-0 flex-col`
              : "flex min-h-0 flex-1 flex-col overflow-hidden"
          }
        >
          {center}
        </GlassPanel>

        <GlassPanel
          as="section"
          aria-label={rightAriaLabel}
          data-testid={rightTestId}
          className={`${DASHBOARD_DESKTOP_COL_CLASS} dashboard-desktop-col--right`}
          shellClassName={dashboardTripleSideShellClass}
          innerClassName={
            rightPadding
              ? `${GLASS_PANEL_BODY_SCROLL} flex min-h-0 flex-col`
              : "flex min-h-0 flex-1 flex-col overflow-hidden"
          }
        >
          {right ?? <DashboardTriplePanelSidePlaceholder />}
        </GlassPanel>
      </div>
    </div>
  );
}
