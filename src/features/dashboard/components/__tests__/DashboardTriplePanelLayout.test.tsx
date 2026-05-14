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
});
