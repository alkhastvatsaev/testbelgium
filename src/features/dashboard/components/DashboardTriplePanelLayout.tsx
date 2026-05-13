"use client";

import type { ReactNode } from "react";
import { GLASS_PANEL_BODY_SCROLL } from "@/core/ui/glassPanelChrome";

/** Vitres latérales / centre : ombres portées empilées (profondeur), jamais d'inset — le inset créait un faux cadre intérieur. */
export const dashboardTripleSideShellClass =
  "absolute top-1/2 z-40 flex min-h-0 h-[calc(70*var(--safe-vh))] w-[calc(50*var(--safe-vw)-35*var(--safe-vh)-100px+5mm)] -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white/72 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_24px_56px_-22px_rgba(15,23,42,0.08)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500";

export const dashboardTripleCenterShellClass =
  "absolute left-1/2 top-1/2 z-[45] flex min-h-0 h-[calc(70*var(--safe-vh))] w-[calc(70*var(--safe-vh))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white/76 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_28px_58px_-22px_rgba(15,23,42,0.08),0_0_80px_rgba(59,130,246,0.09)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-all duration-500";

/** Zone latérale vide : pas de cadre intérieur — surface utilisable à 100 %. */
export function DashboardTriplePanelSidePlaceholder() {
  return <div aria-label="Zone vide" className="min-h-0 flex-1 bg-transparent" />;
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
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <div 
        data-testid={rootTestId} 
        className="relative h-full w-full max-w-[1440px] max-h-[900px]"
      >
        <section
          aria-label={leftAriaLabel}
          data-testid={leftTestId}
          className={`${dashboardTripleSideShellClass} left-12`}
        >
          <div className={`${GLASS_PANEL_BODY_SCROLL} flex min-h-0 flex-col`}>{left ?? <DashboardTriplePanelSidePlaceholder />}</div>
        </section>

        <section
          aria-label={centerAriaLabel}
          data-testid={centerTestId}
          className={dashboardTripleCenterShellClass}
        >
          <div className={centerPadding ? `${GLASS_PANEL_BODY_SCROLL} flex min-h-0 flex-col` : "flex min-h-0 flex-col flex-1 overflow-hidden"}>{center}</div>
        </section>

        <section
          aria-label={rightAriaLabel}
          data-testid={rightTestId}
          className={`${dashboardTripleSideShellClass} right-12`}
        >
          <div className={rightPadding ? `${GLASS_PANEL_BODY_SCROLL} flex min-h-0 flex-col` : "flex min-h-0 flex-col flex-1 overflow-hidden"}>{right ?? <DashboardTriplePanelSidePlaceholder />}</div>
        </section>
      </div>
    </div>
  );
}
 