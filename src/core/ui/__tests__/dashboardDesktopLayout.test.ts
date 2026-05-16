import {
  DASHBOARD_CANVAS_MAX_WIDTH_PX,
  DASHBOARD_CENTER_MIN_WIDTH_PX,
  DASHBOARD_CSS_VAR,
  DASHBOARD_DESKTOP_APP_SHELL_CLASS,
  DASHBOARD_DESKTOP_COL_CLASS,
  DASHBOARD_DESKTOP_PAGER_OFFSET_CLASS,
  DASHBOARD_DESKTOP_TRACK_CLASS,
  DASHBOARD_DESKTOP_GALAXY_STRIP_CLASS,
  DASHBOARD_GALAXY_BAND_HEIGHT_PX,
  DASHBOARD_GRID_GAP_PX,
  DASHBOARD_HEADER_HEIGHT_PX,
  DASHBOARD_PANEL_MAX_WIDTH_PX,
  DASHBOARD_PANEL_MIN_WIDTH_PX,
  DASHBOARD_TRACK_MIN_WIDTH_PX,
  DASHBOARD_VIEWPORT_MIN_WIDTH_PX,
} from "@/core/ui/dashboardDesktopLayout";

describe("dashboardDesktopLayout tokens", () => {
  it("defines enterprise grid minimums (rails never below panel min)", () => {
    expect(DASHBOARD_PANEL_MIN_WIDTH_PX).toBe(380);
    expect(DASHBOARD_PANEL_MAX_WIDTH_PX).toBe(400);
    expect(DASHBOARD_CENTER_MIN_WIDTH_PX).toBe(400);
    expect(DASHBOARD_CANVAS_MAX_WIDTH_PX).toBe(1580);
    expect(DASHBOARD_GRID_GAP_PX).toBe(24);
    expect(DASHBOARD_HEADER_HEIGHT_PX).toBe(70);
    expect(DASHBOARD_VIEWPORT_MIN_WIDTH_PX).toBe(768);
    expect(DASHBOARD_TRACK_MIN_WIDTH_PX).toBe(
      DASHBOARD_PANEL_MIN_WIDTH_PX * 2 +
        DASHBOARD_CENTER_MIN_WIDTH_PX +
        DASHBOARD_GRID_GAP_PX * 2,
    );
  });

  it("maps to centralized CSS custom properties", () => {
    expect(DASHBOARD_CSS_VAR.panelMin).toBe("--dashboard-panel-min-width");
    expect(DASHBOARD_CSS_VAR.gridGap).toBe("--dashboard-grid-gap");
    expect(DASHBOARD_CSS_VAR.gridColumns).toBe("--dashboard-grid-columns");
    expect(DASHBOARD_CSS_VAR.headerHeight).toBe("--dashboard-header-height");
  });

  it("exposes layout surface classes from dashboard-layout.css", () => {
    expect(DASHBOARD_DESKTOP_APP_SHELL_CLASS).toContain("dashboard-desktop-app");
    expect(DASHBOARD_DESKTOP_TRACK_CLASS).toBe("dashboard-desktop-track");
    expect(DASHBOARD_DESKTOP_COL_CLASS).toBe("dashboard-desktop-col");
    expect(DASHBOARD_DESKTOP_PAGER_OFFSET_CLASS).toBe("dashboard-desktop-pager-offset");
    expect(DASHBOARD_DESKTOP_GALAXY_STRIP_CLASS).toBe("dashboard-desktop-galaxy-strip");
    expect(DASHBOARD_GALAXY_BAND_HEIGHT_PX).toBe(56);
  });
});
