"use client";

import type { ReactNode } from "react";
import {
  DASHBOARD_DESKTOP_CENTER_COL_CLASS,
  DASHBOARD_DESKTOP_ROOT_CLASS,
  DASHBOARD_DESKTOP_SIDE_COL_CLASS,
  DASHBOARD_DESKTOP_TRACK_CLASS,
  DASHBOARD_PANEL_INNER_CLIP_CLASS,
  dashboardTripleCenterShellClass,
  dashboardTripleSideShellClass,
} from "@/core/ui/dashboardDesktopLayout";
import { GLASS_PANEL_BODY_SCROLL } from "@/core/ui/glassPanelChrome";

export {
  dashboardTripleSideShellClass,
  dashboardTripleCenterShellClass,
} from "@/core/ui/dashboardDesktopLayout";

/** Zone latérale vide : pas de cadre intérieur — surface utilisable à 100 %. */
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

/**
 * Gabarit commun : panneau gauche / centre / droite (pages secondaires du carousel).
 * Layout stable en flex (voir `dashboardDesktopLayout.ts`) — plus d’absolute + calc vw/vh.
 */
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
      <div className={DASHBOARD_DESKTOP_TRACK_CLASS}>
        <section
          aria-label={leftAriaLabel}
          data-testid={leftTestId}
          className={`${DASHBOARD_DESKTOP_SIDE_COL_CLASS} ${dashboardTripleSideShellClass}`}
        >
          <div className={DASHBOARD_PANEL_INNER_CLIP_CLASS}>
            <div className={`${GLASS_PANEL_BODY_SCROLL} flex min-h-0 flex-col`}>
              {left ?? <DashboardTriplePanelSidePlaceholder />}
            </div>
          </div>
        </section>

        <section aria-label={centerAriaLabel} data-testid={centerTestId} className={DASHBOARD_DESKTOP_CENTER_COL_CLASS}>
          <div className={dashboardTripleCenterShellClass}>
            <div className={DASHBOARD_PANEL_INNER_CLIP_CLASS}>
              <div
                className={
                  centerPadding
                    ? `${GLASS_PANEL_BODY_SCROLL} flex min-h-0 flex-col`
                    : "flex min-h-0 flex-1 flex-col overflow-hidden"
                }
              >
                {center}
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label={rightAriaLabel}
          data-testid={rightTestId}
          className={`${DASHBOARD_DESKTOP_SIDE_COL_CLASS} ${dashboardTripleSideShellClass}`}
        >
          <div className={DASHBOARD_PANEL_INNER_CLIP_CLASS}>
            <div
              className={
                rightPadding
                  ? `${GLASS_PANEL_BODY_SCROLL} flex min-h-0 flex-col`
                  : "flex min-h-0 flex-1 flex-col overflow-hidden"
              }
            >
              {right ?? <DashboardTriplePanelSidePlaceholder />}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
