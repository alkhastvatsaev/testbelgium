/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import InterventionCalendarPanel from "../components/InterventionCalendarPanel";

jest.mock("@/context/CompanyWorkspaceContext", () => ({
  useCompanyWorkspaceOptional: jest.fn(),
}));

jest.mock("@/features/backoffice/useBackOfficeInterventions", () => ({
  useBackOfficeInterventions: jest.fn(),
}));

import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { useBackOfficeInterventions } from "@/features/backoffice/useBackOfficeInterventions";

describe("InterventionCalendarPanel", () => {
  const mockWorkspace = useCompanyWorkspaceOptional as jest.Mock;
  const mockInterventions = useBackOfficeInterventions as jest.Mock;

  const tenantWorkspace = {
    firebaseUid: "u1",
    memberships: [{ companyId: "c1", companyName: "TestCo", role: "admin" as const }],
    activeCompanyId: "c1",
    setActiveCompanyId: jest.fn(),
    activeRole: "admin" as const,
    isTenantUser: true,
    refreshClaimsSilent: jest.fn(async () => true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInterventions.mockReturnValue({
      interventions: [],
      loading: false,
      error: null,
      firebaseUid: "u1",
    });
  });

  it("affiche le portail fermé hors tenant société", () => {
    mockWorkspace.mockReturnValue(null);
    render(<InterventionCalendarPanel />);
    expect(screen.getByTestId("calendar-integration-gate")).toBeInTheDocument();
  });

  it("affiche la grille mois, le détail du jour et bascule vers la semaine", () => {
    mockWorkspace.mockReturnValue(tenantWorkspace);
    render(<InterventionCalendarPanel />);
    expect(screen.getByTestId("calendar-integration-panel")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-month-grid")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-detail")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("calendar-tab-week"));
    expect(screen.getByTestId("calendar-week-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-day-detail")).not.toBeInTheDocument();
  });

  it("expose le raccourci Aujourd’hui", () => {
    mockWorkspace.mockReturnValue(tenantWorkspace);
    render(<InterventionCalendarPanel />);
    const btn = screen.getByTestId("calendar-go-today");
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
  });
});
