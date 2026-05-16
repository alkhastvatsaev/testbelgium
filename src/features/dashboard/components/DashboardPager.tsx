"use client";

import type { ReactNode } from "react";
import { useDashboardPager } from "@/features/dashboard/dashboardPagerContext";
import DashboardPagerControls from "@/features/dashboard/components/DashboardPagerControls";
import { DASHBOARD_DESKTOP_PAGER_OFFSET_CLASS } from "@/core/ui/dashboardDesktopLayout";

type Props = {
  pages: ReactNode[];
};

/**
 * Pages plein écran en translation horizontale (`duration-500`).
 * Chaque page définit son propre bloc (`translateZ(0)`) pour que les panneaux `fixed`
 * restent calés sur la fenêtre de cette page.
 */
export default function DashboardPager({ pages }: Props) {
  const { pageIndex, pageCount } = useDashboardPager();

  if (pages.length !== pageCount) {
    console.warn(
      `[DashboardPager] pages.length (${pages.length}) !== pageCount du provider (${pageCount}).`,
    );
  }

  return (
    <div
      className={`absolute inset-0 z-0 overflow-hidden ${DASHBOARD_DESKTOP_PAGER_OFFSET_CLASS}`}
      data-testid="dashboard-pager-root"
    >
      <div
        className="flex h-full flex-row transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none"
        style={{
          width: `${pageCount * 100}%`,
          transform: `translate3d(-${(pageIndex * 100) / pageCount}%, 0, 0)`,
        }}
        data-testid="dashboard-pager-track"
      >
        {pages.map((node, i) => (
          <section
            key={i}
            className={`relative h-full shrink-0 overflow-hidden ${
              pageIndex !== i ? "pointer-events-none" : ""
            }`}
            style={{ width: `${100 / pageCount}%`, transform: "translateZ(0)", backfaceVisibility: "hidden" }}
            aria-hidden={pageIndex !== i}
            data-testid={
              i === 0
                ? "dashboard-page-home"
                : i === 1
                  ? "dashboard-page-secondary"
                  : `dashboard-page-${i}`
            }
          >
            <div
              role={i === 0 ? "main" : undefined}
              className={
                i === 0
                  ? "dashboard-layout mode-presentation relative h-full w-full"
                  : "relative h-full w-full"
              }
            >
              {node}
            </div>
          </section>
        ))}
      </div>

      <DashboardPagerControls />
    </div>
  );
}
