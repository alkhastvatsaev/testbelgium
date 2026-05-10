import { DASHBOARD_PAGE_GUIDE, getDashboardPageGuide } from "@/features/dashboard/dashboardPageGuide";

describe("dashboardPageGuide", () => {
  it("couvre les 3 pages du carrousel actuel", () => {
    expect(DASHBOARD_PAGE_GUIDE).toHaveLength(3);
  });

  it("retourne Carte pour l’index 0", () => {
    expect(getDashboardPageGuide(0)?.title).toBe("Carte");
  });

  it("retourne null pour un index hors plage", () => {
    expect(getDashboardPageGuide(-1)).toBeNull();
    expect(getDashboardPageGuide(99)).toBeNull();
  });
});
