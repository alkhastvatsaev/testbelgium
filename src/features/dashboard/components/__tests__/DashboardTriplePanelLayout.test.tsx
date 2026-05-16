import { render, screen } from "@/test-utils/render";
import DashboardTriplePanelLayout from "@/features/dashboard/components/DashboardTriplePanelLayout";

describe("DashboardTriplePanelLayout", () => {
  it("rend les trois rails avec leurs data-testid", () => {
    render(
      <DashboardTriplePanelLayout
        rootTestId="triple-root"
        leftTestId="triple-left"
        centerTestId="triple-center"
        rightTestId="triple-right"
        left={<span>gauche</span>}
        center={<span>centre</span>}
        right={<span>droite</span>}
      />,
    );

    expect(screen.getByTestId("triple-root")).toBeInTheDocument();
    expect(screen.getByTestId("triple-left")).toBeInTheDocument();
    expect(screen.getByTestId("triple-center")).toBeInTheDocument();
    expect(screen.getByTestId("triple-right")).toBeInTheDocument();
    expect(screen.getByText("gauche")).toBeInTheDocument();
    expect(screen.getByText("centre")).toBeInTheDocument();
    expect(screen.getByText("droite")).toBeInTheDocument();
  });

  it("utilise la grille desktop centralisée", () => {
    const { container } = render(
      <DashboardTriplePanelLayout
        leftTestId="triple-left"
        centerTestId="triple-center"
        rightTestId="triple-right"
      />,
    );

    expect(container.querySelector(".dashboard-desktop-track")).toBeInTheDocument();
  });

  it("applique l’ombre dashboard unifiée sur les coques vitrées", () => {
    render(
      <DashboardTriplePanelLayout
        leftTestId="triple-left"
        centerTestId="triple-center"
        rightTestId="triple-right"
      />,
    );

    expect(screen.getByTestId("triple-left")).toHaveClass("dashboard-panel-shadow");
    expect(screen.getByTestId("triple-left")).toHaveClass("dashboard-desktop-col");
    expect(screen.getByTestId("triple-right")).toHaveClass("dashboard-panel-shadow");
    expect(screen.getByTestId("triple-center").firstElementChild).toHaveClass(
      "dashboard-panel-shadow",
    );
  });
});
