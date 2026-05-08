/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { TechnicianCaseIntentProvider } from "@/context/TechnicianCaseIntentContext";
import { TechnicianFinishJobProvider } from "@/context/TechnicianFinishJobContext";
import { FINISH_JOB_SLOT_INDEX } from "@/features/interventions/finishJobConstants";
import TechnicianDashboardPanel from "../TechnicianDashboardPanel";
import { useTechnicianAssignments } from "@/features/interventions/useTechnicianAssignments";
import { fetchInterventionById } from "@/features/interventions/technicianCaseFetch";
import type { Intervention } from "@/features/interventions/types";

jest.mock("@/features/interventions/useTechnicianAssignments");
jest.mock("@/features/interventions/technicianCaseFetch", () => ({
  fetchInterventionById: jest.fn(),
}));

const mockSetPageIndex = jest.fn();

jest.mock("@/features/dashboard/dashboardPagerContext", () => {
  const actual = jest.requireActual("@/features/dashboard/dashboardPagerContext");
  return {
    ...actual,
    useDashboardPagerOptional: () => ({
      pageIndex: 2,
      pageCount: 4,
      setPageIndex: mockSetPageIndex,
      goNext: jest.fn(),
      goPrev: jest.fn(),
    }),
  };
});

jest.mock("@/core/config/firebase", () => ({
  auth: { currentUser: { uid: "tech-1" } },
  firestore: {},
  storage: {},
  isConfigured: true,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/features/interventions/useInterventionLive", () => ({
  useInterventionLive: jest.fn(() => null),
}));

const mockHook = useTechnicianAssignments as jest.MockedFunction<typeof useTechnicianAssignments>;
const mockFetch = fetchInterventionById as jest.MockedFunction<typeof fetchInterventionById>;

const baseLoc = { lat: 50.84, lng: 4.35 };

function iv(partial: Partial<Intervention> & Pick<Intervention, "id">): Intervention {
  return {
    title: "Test",
    address: "Rue de la Loi, Bruxelles",
    time: "10:00",
    status: "pending",
    location: baseLoc,
    ...partial,
  };
}

function renderPanel() {
  return render(
    <TechnicianCaseIntentProvider>
      <TechnicianFinishJobProvider>
        <TechnicianDashboardPanel />
      </TechnicianFinishJobProvider>
    </TechnicianCaseIntentProvider>,
  );
}

describe("TechnicianDashboardPanel", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-05T14:00:00"));
    mockFetch.mockReset();
    mockSetPageIndex.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    mockHook.mockReset();
  });

  it("affiche les onglets et filtre Aujourd’hui par défaut", () => {
    mockHook.mockReturnValue({
      interventions: [
        iv({ id: "case-today", createdAt: "2026-05-05T09:00:00.000Z", clientName: "Client A" }),
        iv({ id: "case-other-day", createdAt: "2026-05-04T09:00:00.000Z", clientName: "Client B" }),
      ],
      loading: false,
      error: null,
      firebaseUid: "tech-1",
    });

    renderPanel();

    expect(screen.getByTestId("technician-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("technician-tab-today")).toBeInTheDocument();
    expect(screen.getByTestId("technician-case-case-today")).toBeInTheDocument();
    expect(screen.queryByTestId("technician-case-case-other-day")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("technician-tab-week"));
    expect(screen.getByTestId("technician-case-case-other-day")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("technician-tab-all"));
    expect(screen.getByTestId("technician-case-case-today")).toBeInTheDocument();
    expect(screen.getByTestId("technician-case-case-other-day")).toBeInTheDocument();
  });

  it("ouvre et ferme la vue détail du dossier", () => {
    mockHook.mockReturnValue({
      interventions: [
        iv({
          id: "case-detail",
          createdAt: "2026-05-05T11:00:00.000Z",
          clientName: "Martin",
          problem: "Porte bloquée",
        }),
      ],
      loading: false,
      error: null,
      firebaseUid: "tech-1",
    });

    renderPanel();

    fireEvent.click(screen.getByTestId("technician-case-case-detail"));
    expect(screen.getByTestId("technician-detail-drawer")).toBeInTheDocument();
    expect(screen.getByText(/Porte bloquée/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("technician-detail-close"));
    expect(screen.queryByTestId("technician-detail-drawer")).not.toBeInTheDocument();
  });

  it("Terminer l’intervention envoie vers la page flux fin", () => {
    mockHook.mockReturnValue({
      interventions: [
        iv({
          id: "case-detail",
          createdAt: "2026-05-05T11:00:00.000Z",
          clientName: "Martin",
          problem: "Porte bloquée",
        }),
      ],
      loading: false,
      error: null,
      firebaseUid: "tech-1",
    });

    renderPanel();

    fireEvent.click(screen.getByTestId("technician-case-case-detail"));
    fireEvent.click(screen.getByTestId("technician-finish-job-start"));

    expect(mockSetPageIndex).toHaveBeenCalledWith(FINISH_JOB_SLOT_INDEX);
  });

  it("masque Terminer si dossier déjà fait", () => {
    mockHook.mockReturnValue({
      interventions: [
        iv({
          id: "case-done",
          status: "done",
          clientName: "Fini",
          createdAt: "2026-05-05T10:00:00.000Z",
        }),
      ],
      loading: false,
      error: null,
      firebaseUid: "tech-1",
    });

    renderPanel();

    fireEvent.click(screen.getByTestId("technician-case-case-done"));
    expect(screen.queryByTestId("technician-finish-job-start")).not.toBeInTheDocument();
  });

  it("affiche le squelette en chargement", () => {
    mockHook.mockReturnValue({
      interventions: [],
      loading: true,
      error: null,
      firebaseUid: "tech-1",
    });

    renderPanel();
    expect(screen.getByTestId("technician-dashboard-loading")).toBeInTheDocument();
  });
});
