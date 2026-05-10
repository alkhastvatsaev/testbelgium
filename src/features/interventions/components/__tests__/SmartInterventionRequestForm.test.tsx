import { render, screen, fireEvent, waitFor } from "@/test-utils/render";
import { within } from "@testing-library/react";
import { setDoc } from "firebase/firestore";
import SmartInterventionRequestForm from "../SmartInterventionRequestForm";
import { SMART_INTERVENTION_DRAFT_STORAGE_KEY } from "../../smartInterventionConstants";
import { mockState } from "@/test-utils/mockState";

jest.mock("@/core/config/firebase", () => ({
  isConfigured: true,
  firestore: {},
  auth: { currentUser: { uid: "tester-1" } },
  storage: null,
}));

jest.mock("@/features/interventions/recordDuplicateAlertIfNeeded", () => ({
  recordDuplicateAlertIfNeeded: jest.fn(() => Promise.resolve()),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), message: jest.fn() },
}));

describe("SmartInterventionRequestForm", () => {
  beforeEach(() => {
    mockState.currentUser = { uid: "tester-1" };
    localStorage.clear();
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ location: { lat: 50.84, lng: 4.35 }, approximate: false }),
    });
    delete (global.navigator as { geolocation?: Geolocation }).geolocation;
  });

  /** Passe l’étape 1 (coordonnées) pour atteindre le bloc adresse. */
  function goToAddressStep() {
    // No-op : l'adresse est maintenant sur la première étape avec les contacts
  }

  it("désactive Continuer sur l’étape adresse si l’adresse est trop courte (un caractère)", () => {
    render(<SmartInterventionRequestForm />);
    goToAddressStep();
    fireEvent.change(screen.getByTestId("smart-form-address"), { target: { value: "R" } });
    expect(screen.getByTestId("smart-form-address")).toBeInTheDocument();
    expect(screen.getByTestId("smart-form-continue-address")).toBeDisabled();
  });

  it("revient à l’étape adresse après retour depuis le type de problème", async () => {
    render(<SmartInterventionRequestForm />);
    goToAddressStep();
    fireEvent.change(screen.getByTestId("smart-form-address"), {
      target: { value: "Rue de test 1, 1000 Bruxelles" },
    });
    fireEvent.click(screen.getByTestId("smart-form-continue-address"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-description")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("smart-form-back"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-address")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("smart-form-description")).not.toBeInTheDocument();
  });

  it("affiche l’étape description et permet de saisir un texte", async () => {
    render(<SmartInterventionRequestForm />);
    expect(screen.getByTestId("smart-intervention-form")).toBeInTheDocument();
    goToAddressStep();
    expect(screen.getByTestId("smart-form-address-mini-map")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("smart-form-address"), {
      target: { value: "Rue de test 1, 1000 Bruxelles" },
    });
    fireEvent.click(screen.getByTestId("smart-form-continue-address"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-description")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("smart-form-description"), { target: { value: "Test description" } });
    expect(screen.getByTestId("smart-form-description")).toHaveValue("Test description");
  });

  it("à l’étape 5 photos, affiche quatre emplacements photo", async () => {
    render(<SmartInterventionRequestForm />);
    goToAddressStep();
    fireEvent.change(screen.getByTestId("smart-form-address"), {
      target: { value: "Rue de test 1, 1000 Bruxelles" },
    });
    fireEvent.click(screen.getByTestId("smart-form-continue-address"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-continue")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("smart-form-description"), { target: { value: "Test" } });
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-dropzone")).toBeInTheDocument();
    });
    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`smart-form-photo-slot-${i}`)).toBeInTheDocument();
    }
  });

  it("au récap (étape 6), affiche un récap visuel contenu dans le panneau", async () => {
    render(<SmartInterventionRequestForm />);
    goToAddressStep();
    fireEvent.change(screen.getByTestId("smart-form-address"), {
      target: { value: "Rue de test 1, 1000 Bruxelles" },
    });
    fireEvent.click(screen.getByTestId("smart-form-continue-address"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-continue")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("smart-form-description"), { target: { value: "Test" } });
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-dropzone")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Étape 4 — Date et Heure/i })).toBeInTheDocument();
    });
    const days = screen.getByLabelText("Jours disponibles");
    const firstDay = within(days).getAllByRole("button")[0];
    fireEvent.click(firstDay);
    fireEvent.click(screen.getByRole("button", { name: "08:00" }));
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-recap-panel")).toBeInTheDocument();
    });
    expect(screen.getByRole("group", { name: /Adresse :/ })).toBeInTheDocument();
    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`smart-form-recap-photo-preview-${i}`)).toBeInTheDocument();
    }
  });

  it("affiche le bloc Contact au récap lorsque le prénom est renseigné", async () => {
    render(<SmartInterventionRequestForm />);
    fireEvent.change(screen.getByTestId("smart-form-first-name"), { target: { value: "Léa" } });
    goToAddressStep();
    fireEvent.change(screen.getByTestId("smart-form-address"), {
      target: { value: "Rue de test 1, 1000 Bruxelles" },
    });
    fireEvent.click(screen.getByTestId("smart-form-continue-address"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-continue")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("smart-form-description"), { target: { value: "Test" } });
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-dropzone")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Étape 4 — Date et Heure/i })).toBeInTheDocument();
    });
    const days = screen.getByLabelText("Jours disponibles");
    fireEvent.click(within(days).getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: "08:00" }));
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-recap-contact")).toBeInTheDocument();
    });
    expect(screen.getByTestId("smart-form-recap-contact")).toHaveTextContent("Léa");
  });

  it("au récap, ouvrir et fermer la feuille des photos", async () => {
    render(<SmartInterventionRequestForm />);
    goToAddressStep();
    fireEvent.change(screen.getByTestId("smart-form-address"), {
      target: { value: "Rue de test 1, 1000 Bruxelles" },
    });
    fireEvent.click(screen.getByTestId("smart-form-continue-address"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-continue")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("smart-form-description"), { target: { value: "Test" } });
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-dropzone")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Étape 4 — Date et Heure/i })).toBeInTheDocument();
    });
    const days = screen.getByLabelText("Jours disponibles");
    fireEvent.click(within(days).getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: "08:00" }));
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-recap-photos-open")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("smart-form-recap-photos-sheet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("smart-form-recap-photos-open"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-recap-photos-sheet")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("smart-form-recap-photos-close"));
    await waitFor(() => {
      expect(screen.queryByTestId("smart-form-recap-photos-sheet")).not.toBeInTheDocument();
    });
  });

  it("envoie une intervention pending lorsque les champs requis sont remplis", async () => {
    render(<SmartInterventionRequestForm />);

    fireEvent.change(screen.getByTestId("smart-form-first-name"), { target: { value: "Marie" } });
    fireEvent.change(screen.getByTestId("smart-form-phone"), { target: { value: "+32 470 00 00 00" } });
    goToAddressStep();
    fireEvent.change(screen.getByTestId("smart-form-address"), {
      target: { value: "Rue de la Loi 16, 1000 Bruxelles" },
    });
    fireEvent.click(screen.getByTestId("smart-form-continue-address"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-continue")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("smart-form-description"), { target: { value: "Porte bloquée" } });
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-dropzone")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Étape 4 — Date et Heure/i })).toBeInTheDocument();
    });
    const days = screen.getByLabelText("Jours disponibles");
    fireEvent.click(within(days).getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: "08:00" }));
    fireEvent.click(screen.getByTestId("smart-form-continue"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-submit")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("smart-form-submit"));

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalled();
    });

    const payload = (setDoc as jest.Mock).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.status).toBe("pending");
    expect(payload.createdByUid).toBe("tester-1");
    expect(payload.clientFirstName).toBe("Marie");
    expect(payload.clientPhone).toBe("+32 470 00 00 00");
  });

  it("remplit l’adresse via le bouton de géolocalisation et l’API inverse", async () => {
    const getCurrentPosition = jest.fn((success: (p: GeolocationPosition) => void) => {
      success({
        coords: {
          latitude: 50.84,
          longitude: 4.35,
          accuracy: 8,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });
    Object.defineProperty(global.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        address: "Avenue Test 10, 1000 Bruxelles",
        location: { lat: 50.84, lng: 4.35 },
        approximate: false,
      }),
    });

    render(<SmartInterventionRequestForm />);
    goToAddressStep();
    fireEvent.click(screen.getByTestId("smart-form-locate"));

    await waitFor(() => {
      expect(screen.getByTestId("smart-form-continue-address")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId("smart-form-continue-address"));
    await waitFor(() => {
      expect(screen.getByTestId("smart-form-description")).toBeInTheDocument();
    });
    await waitFor(() => {
      const raw = localStorage.getItem(SMART_INTERVENTION_DRAFT_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!) as { payload?: { address?: string } };
      expect(parsed.payload?.address).toBe("Avenue Test 10, 1000 Bruxelles");
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/maps\/geocode\?lat=50\.84&lng=4\.35/),
    );
  });
});
