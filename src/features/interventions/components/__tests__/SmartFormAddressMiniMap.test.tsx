/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import SmartFormAddressMiniMap from "../SmartFormAddressMiniMap";

describe("SmartFormAddressMiniMap", () => {
  const prevToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  afterEach(() => {
    if (prevToken === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = prevToken;
  });

  it("affiche le conteneur avec testid (sans jeton : message de config)", () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    render(<SmartFormAddressMiniMap address="" placeLatLng={undefined} />);
    expect(screen.getByTestId("smart-form-address-mini-map")).toBeInTheDocument();
    expect(screen.getByText(/NEXT_PUBLIC_MAPBOX_TOKEN/)).toBeInTheDocument();
  });

  it("affiche le conteneur carte lorsque le jeton Mapbox est défini", () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "test-token";
    render(<SmartFormAddressMiniMap address="Rue de la Loi" placeLatLng={undefined} />);
    expect(screen.getByTestId("smart-form-address-mini-map")).toBeInTheDocument();
    expect(screen.queryByText(/NEXT_PUBLIC_MAPBOX_TOKEN/)).not.toBeInTheDocument();
  });
});
