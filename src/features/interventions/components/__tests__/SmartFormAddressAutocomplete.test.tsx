/** @jest-environment jsdom */
import { createRef } from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import SmartFormAddressAutocomplete from "../SmartFormAddressAutocomplete";

jest.mock("@/features/interventions/googleMapsPlacesLoader", () => ({
  loadGoogleMapsScript: jest.fn(() => Promise.resolve()),
}));

const KEY = "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY";

describe("SmartFormAddressAutocomplete", () => {
  const originalKey = process.env[KEY];

  beforeEach(() => {
    process.env[KEY] = "test-google-key";
    const AutocompleteService = function AutocompleteService() {
      /* eslint-disable @typescript-eslint/no-unused-vars */
    };
    AutocompleteService.prototype.getPlacePredictions = function (
      _req: unknown,
      cb: (preds: unknown[] | null, status: string) => void,
    ) {
      cb([{ place_id: "p1", description: "Rue du Test 1, 1000 Bruxelles" }], "OK");
    };

    (
      window as unknown as {
        google?: { maps: { places: { AutocompleteService: typeof AutocompleteService; PlacesServiceStatus: { OK: string } } } };
      }
    ).google = {
      maps: {
        places: {
          AutocompleteService: AutocompleteService as unknown as typeof AutocompleteService,
          PlacesServiceStatus: { OK: "OK" },
        },
      },
    };
  });

  afterEach(() => {
    process.env[KEY] = originalKey;
    delete (window as unknown as { google?: unknown }).google;
    jest.clearAllMocks();
  });

  it("affiche le champ adresse", () => {
    const onValueChange = jest.fn();
    const onPlaceSelect = jest.fn();
    render(
      <SmartFormAddressAutocomplete value="" onValueChange={onValueChange} onPlaceSelect={onPlaceSelect} />,
    );
    expect(screen.getByTestId("smart-form-address")).toBeInTheDocument();
  });

  it("transmet ref à l input", () => {
    const ref = createRef<HTMLInputElement>();
    const onValueChange = jest.fn();
    const onPlaceSelect = jest.fn();
    render(
      <SmartFormAddressAutocomplete ref={ref} value="" onValueChange={onValueChange} onPlaceSelect={onPlaceSelect} />,
    );
    expect(ref.current).toBe(screen.getByTestId("smart-form-address"));
  });

  it("projette la liste de suggestions sur document.body pour éviter les pièges de z-index", async () => {
    jest.useFakeTimers();
    const onValueChange = jest.fn();
    const onPlaceSelect = jest.fn();
    render(
      <SmartFormAddressAutocomplete value="" onValueChange={onValueChange} onPlaceSelect={onPlaceSelect} />,
    );
    const input = screen.getByTestId("smart-form-address");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Rue" } });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      const list = document.body.querySelector('[data-testid="smart-form-address-suggestions"]');
      expect(list).toBeInTheDocument();
      expect(list?.parentElement).toBe(document.body);
    });
    jest.useRealTimers();
  });
});
