import type { DashboardPagerApi } from "@/features/dashboard/dashboardPagerContext";

export const BACKOFFICE_HUB_ANCHOR_DUPLICATES = "backoffice-hub-duplicates";
export const BACKOFFICE_HUB_ANCHOR_DASHBOARD = "backoffice-hub-dashboard";
export const BACKOFFICE_HUB_ANCHOR_CALENDAR = "backoffice-hub-calendar";


export function navigateBackOfficeHub(pager: DashboardPagerApi | null | undefined, anchor?: string): void {
  if (!pager) return;
  const wasOnMap = pager.pageIndex === 0;
  pager.setPageIndex(0);
  if (!anchor || typeof document === "undefined") return;
  const run = () => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (wasOnMap) {
    requestAnimationFrame(() => requestAnimationFrame(run));
  } else {
    window.setTimeout(run, 520);
  }
}
