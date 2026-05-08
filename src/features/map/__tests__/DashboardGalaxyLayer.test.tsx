/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { GalaxyLayerBridgeProvider } from "@/features/map/GalaxyLayerBridgeContext";
import DashboardGalaxyLayer from "../components/DashboardGalaxyLayer";

jest.mock("../components/MapGalaxyTranscriptionLayer", () => ({
  __esModule: true,
  default: function MockGalaxy() {
    return <div data-testid="map-galaxy-layer-mock" />;
  },
}));

describe("DashboardGalaxyLayer", () => {
  it("monte la couche Galaxy sous le provider", () => {
    render(
      <GalaxyLayerBridgeProvider>
        <DashboardGalaxyLayer />
      </GalaxyLayerBridgeProvider>,
    );
    expect(screen.getByTestId("map-galaxy-layer-mock")).toBeInTheDocument();
  });
});
