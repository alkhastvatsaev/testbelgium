"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDashboardPager } from "@/features/dashboard/dashboardPagerContext";

const btnClass =
  "fixed top-1/2 z-[30] flex min-h-[44px] min-w-[44px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-2 text-slate-700 outline-none backdrop-blur-0 shadow-none transition-[color,transform] duration-300 hover:scale-105 hover:text-slate-900 motion-reduce:transition-none motion-reduce:hover:scale-100 active:scale-95 disabled:pointer-events-none disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-slate-900/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

const iconClass =
  "h-7 w-7 shrink-0 drop-shadow-[0_1px_2px_rgba(255,255,255,0.92),0_1px_3px_rgba(15,23,42,0.28)]";

/**
 * Flancs gauche / droit, centrés verticalement ; `z-[30]` pour rester **sous** les vitres (`z-40` / `z-[45]`) lors des changements de page.
 */
export default function DashboardPagerControls() {
  const { pageIndex, pageCount, goNext, goPrev } = useDashboardPager();
  const atStart = pageIndex === 0;
  const atEnd = pageIndex >= pageCount - 1;
  const human = pageIndex + 1;

  return (
    <>
      <button
        type="button"
        data-testid="dashboard-pager-prev"
        aria-label={atStart ? "Déjà sur la première page" : `Revenir à la page ${human - 1}`}
        disabled={atStart}
        onClick={goPrev}
        className={`${btnClass} left-1 right-auto`}
      >
        <ChevronLeft className={iconClass} aria-hidden strokeWidth={2.25} />
      </button>

      <button
        type="button"
        data-testid="dashboard-pager-next"
        aria-label={
          atEnd
            ? "Déjà sur la dernière page"
            : pageCount === 2
              ? "Aller à la deuxième page"
              : `Aller à la page ${human + 1}`
        }
        disabled={atEnd}
        onClick={goNext}
        className={`${btnClass} left-auto right-1`}
      >
        <ChevronRight className={iconClass} aria-hidden strokeWidth={2.25} />
      </button>
    </>
  );
}
