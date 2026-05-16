"use client";

import type { ReactNode } from "react";
import {
  DASHBOARD_DESKTOP_APP_SHELL_CLASS,
  DASHBOARD_DESKTOP_CANVAS_CLASS,
  DASHBOARD_DESKTOP_GALAXY_DOCK_CHROME_CLASS,
  DASHBOARD_DESKTOP_GALAXY_DOCK_CLASS,
  DASHBOARD_DESKTOP_GRID_CLASS,
  DASHBOARD_DESKTOP_OVERLAY_ROOT_CLASS,
  DASHBOARD_DESKTOP_STACK_BODY_CLASS,
  DASHBOARD_DESKTOP_STACK_CLASS,
  DASHBOARD_DESKTOP_STACK_HEADER_CLASS,
} from "@/core/ui/dashboardDesktopLayout";

type Props = {
  header: ReactNode;
  pager: ReactNode;
  galaxy: ReactNode;
};

/**
 * Desktop shell — rails 1–4 via `.dashboard-desktop-grid`.
 * Galaxy dock reuses the same grid; bar is column 2 only (under the map).
 */
export default function DashboardDesktopShell({ header, pager, galaxy }: Props) {
  return (
    <div id="dashboard-root-scroll" className={DASHBOARD_DESKTOP_APP_SHELL_CLASS}>
      <div className={DASHBOARD_DESKTOP_CANVAS_CLASS}>
        <div className={DASHBOARD_DESKTOP_STACK_CLASS} data-testid="dashboard-desktop-stack">
          <header className={DASHBOARD_DESKTOP_STACK_HEADER_CLASS} data-testid="dashboard-global-header">
            <div className={DASHBOARD_DESKTOP_GRID_CLASS}>{header}</div>
          </header>

          <div className={DASHBOARD_DESKTOP_STACK_BODY_CLASS}>
            <div
              id="dashboard-overlay-root"
              className={DASHBOARD_DESKTOP_OVERLAY_ROOT_CLASS}
              aria-hidden
            />
            <div className="dashboard-desktop-pager-host">{pager}</div>
          </div>

          <div
            id="dashboard-galaxy-dock"
            className={DASHBOARD_DESKTOP_GALAXY_DOCK_CLASS}
            data-testid="dashboard-galaxy-dock"
          >
            <div
              className={DASHBOARD_DESKTOP_GALAXY_DOCK_CHROME_CLASS}
              data-testid="dashboard-galaxy-center-slot"
            >
              <div className="dashboard-desktop-galaxy-dock-chrome-inner">{galaxy}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
