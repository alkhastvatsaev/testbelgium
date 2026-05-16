import {
  PANEL_CSS_VAR,
  PANEL_GLASS_CLASS,
  glassPanelShellClass,
} from "@/core/ui/glassPanelChrome";

describe("glassPanelChrome", () => {
  it("exposes canonical panel shadow CSS variables", () => {
    expect(PANEL_CSS_VAR.shadow).toBe("--panel-shadow");
    expect(PANEL_CSS_VAR.shadowHover).toBe("--panel-shadow-hover");
  });

  it("includes panel-glass on every glass shell", () => {
    const shell = glassPanelShellClass({ bg: "bg-white/80" });
    expect(shell).toContain(PANEL_GLASS_CLASS);
    expect(shell).not.toMatch(/overflow-hidden/);
  });
});
