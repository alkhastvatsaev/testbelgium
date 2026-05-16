import {
  DASHBOARD_STACK_MAX_WIDTH_PX,
  DASHBOARD_CANVAS_MAX_WIDTH_PX,
  DASHBOARD_CENTER_MIN_WIDTH_PX,
  DASHBOARD_CSS_VAR,
  DASHBOARD_DESKTOP_APP_SHELL_CLASS,
  DASHBOARD_DESKTOP_COL_CLASS,
  DASHBOARD_DESKTOP_GRID_CLASS,
  DASHBOARD_DESKTOP_STACK_CLASS,
  DASHBOARD_DESKTOP_GALAXY_STRIP_CLASS,
  DASHBOARD_GALAXY_BAND_HEIGHT_PX,
  DASHBOARD_GRID_GAP_PX,
  DASHBOARD_HEADER_HEIGHT_PX,
  DASHBOARD_RAIL_MIN_WIDTH_PX,
  DASHBOARD_TRACK_MIN_WIDTH_PX,
  DASHBOARD_VIEWPORT_MIN_WIDTH_PX,
  PANEL_GLASS_CLASS,
} from "@/core/ui/dashboardDesktopLayout";

describe("dashboardDesktopLayout tokens", () => {
  it("defines v2 grid minimums", () => {
    expect(DASHBOARD_RAIL_MIN_WIDTH_PX).toBe(320);
    expect(DASHBOARD_CENTER_MIN_WIDTH_PX).toBe(500);
    expect(DASHBOARD_STACK_MAX_WIDTH_PX).toBe(1480);
    expect(DASHBOARD_CANVAS_MAX_WIDTH_PX).toBe(1480);
    expect(DASHBOARD_GRID_GAP_PX).toBe(24);
    expect(DASHBOARD_HEADER_HEIGHT_PX).toBe(70);
    expect(DASHBOARD_VIEWPORT_MIN_WIDTH_PX).toBe(768);
    expect(DASHBOARD_TRACK_MIN_WIDTH_PX).toBe(
      DASHBOARD_RAIL_MIN_WIDTH_PX * 2 +
        DASHBOARD_CENTER_MIN_WIDTH_PX +
        DASHBOARD_GRID_GAP_PX * 2,
    );
  });

  it("maps to centralized CSS custom properties", () => {
    expect(DASHBOARD_CSS_VAR.railMin).toBe("--dashboard-rail-min-width");
    expect(DASHBOARD_CSS_VAR.gridGap).toBe("--dashboard-grid-gap");
    expect(DASHBOARD_CSS_VAR.gridColumns).toBe("--dashboard-grid-columns");
    expect(DASHBOARD_CSS_VAR.stackMax).toBe("--dashboard-stack-max-width");
  });

  it("exposes layout surface classes from dashboard-layout.css", () => {
    expect(DASHBOARD_DESKTOP_APP_SHELL_CLASS).toBe("dashboard-desktop-app");
    expect(DASHBOARD_DESKTOP_GRID_CLASS).toBe("dashboard-desktop-grid");
    expect(DASHBOARD_DESKTOP_STACK_CLASS).toBe("dashboard-desktop-stack");
    expect(DASHBOARD_DESKTOP_COL_CLASS).toBe("dashboard-desktop-col");
    expect(PANEL_GLASS_CLASS).toBe("panel-glass");
    expect(DASHBOARD_DESKTOP_GALAXY_STRIP_CLASS).toBe("dashboard-desktop-galaxy-strip");
    expect(DASHBOARD_GALAXY_BAND_HEIGHT_PX).toBe(56);
  });
});
