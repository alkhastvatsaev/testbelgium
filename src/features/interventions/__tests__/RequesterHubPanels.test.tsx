/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import RequesterProfilePanel from "../components/RequesterProfilePanel";
import RequesterInterventionPanel from "../components/RequesterInterventionPanel";
import RequesterTrackingPanel from "../components/RequesterTrackingPanel";
import { useRequesterHub } from "../context/RequesterHubContext";

jest.mock("../context/RequesterHubContext", () => ({
  useRequesterHub: jest.fn(),
}));

jest.mock("@/context/CompanyWorkspaceContext", () => ({
  useCompanyWorkspaceOptional: jest.fn(() => null),
}));

jest.mock("@/core/config/firebase", () => ({
  auth: null,
  firestore: null,
  isConfigured: false,
}));

jest.mock("@/features/interventions/components/SmartFormAddressAutocomplete", () => ({
  __esModule: true,
  default: ({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) => (
    <input
      data-testid="mock-address-autocomplete"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
}));

jest.mock("@/features/interventions/components/SmartFormAddressMiniMap", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-address-map" />,
}));

jest.mock("@/features/interventions/useBrowserSpeechDictation", () => ({
  useBrowserSpeechDictation: () => ({
    listening: false,
    supported: false,
    toggleListening: jest.fn(),
  }),
}));

jest.mock("@/features/interventions/smartInterventionConstants", () => ({
  SMART_FORM_TEMPLATES: [
    { id: "door", label: "Porte bloquée" },
    { id: "key", label: "Clé cassée" },
    { id: "lock", label: "Serrure" },
  ],
  SMART_INTERVENTION_DRAFT_STORAGE_KEY: "test-smart-draft",
}));

jest.mock("@/features/interventions/recordDuplicateAlertIfNeeded", () => ({
  recordDuplicateAlertIfNeeded: jest.fn(),
}));

jest.mock("@/features/interventions/smartFormReverseGeocode", () => ({
  resolveInterventionAddressFromCoords: jest.fn(),
}));

describe("Requester hub panels", () => {
  const mockUseRequesterHub = useRequesterHub as jest.Mock;
  const setProfile = jest.fn();
  const setRequestData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRequesterHub.mockReturnValue({
      profile: {
        type: "particulier",
        firstName: "",
        lastName: "",
        companyName: "",
        phone: "",
        defaultAddress: "",
        accessCode: "",
      },
      setProfile,
      requestData: {
        problemLabel: "",
        description: "",
        urgency: false,
        photoDataUrls: [],
        interventionAddress: "",
      },
      setRequestData,
      lastSubmittedRequest: null,
      setLastSubmittedRequest: jest.fn(),
      isSubmitting: false,
      setIsSubmitting: jest.fn(),
      resetRequestOnly: jest.fn(),
      resetAll: jest.fn(),
    });
  });

  it("affiche uniquement les infos essentielles dans le profil demandeur", () => {
    render(<RequesterProfilePanel />);
    expect(screen.getByPlaceholderText("Prénom")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Téléphone")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Code portail / Accès")).not.toBeInTheDocument();
    expect(screen.queryByTestId("requester-access-toggle")).not.toBeInTheDocument();
  });

  it("affiche les choix de problème dans le panel central", () => {
    render(<RequesterInterventionPanel />);
    expect(screen.getByText("Porte bloquée")).toBeInTheDocument();
    expect(screen.getByText("Clé cassée")).toBeInTheDocument();
  });

  it("affiche la dernière demande envoyée dans le suivi", () => {
    mockUseRequesterHub.mockReturnValue({
      ...mockUseRequesterHub(),
      lastSubmittedRequest: {
        problemLabel: "Porte bloquée",
        description: "",
        urgency: true,
        photoDataUrls: [],
        interventionAddress: "Rue de la Loi 16",
      },
    });

    render(<RequesterTrackingPanel />);
    expect(screen.getByText("Demande reçue")).toBeInTheDocument();
    expect(screen.queryByText("Suivi en direct")).not.toBeInTheDocument();
    expect(screen.queryByText("Nous avons bien reçu votre demande.")).not.toBeInTheDocument();
  });
});
