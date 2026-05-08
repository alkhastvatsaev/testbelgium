/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import BackOfficeDashboardPanel from "../components/BackOfficeDashboardPanel";

jest.mock("@/context/CompanyWorkspaceContext", () => ({
  useCompanyWorkspaceOptional: jest.fn(),
}));

jest.mock("@/features/technicians/hooks", () => ({
  useTechnicians: jest.fn(() => ({ technicians: [], loading: false })),
}));

jest.mock("@/features/backoffice/useBackOfficeInterventions", () => ({
  useBackOfficeInterventions: jest.fn(() => ({
    interventions: [],
    loading: false,
    error: null,
    firebaseUid: "u1",
  })),
}));

jest.mock("@/features/interventions/useInterventionLive", () => ({
  useInterventionLive: jest.fn(() => null),
}));

import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";

describe("BackOfficeDashboardPanel", () => {
  const mockWorkspace = useCompanyWorkspaceOptional as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche la barrière hors tenant société", () => {
    mockWorkspace.mockReturnValue(null);
    render(<BackOfficeDashboardPanel />);
    expect(screen.getByTestId("back-office-gate")).toBeInTheDocument();
  });

  it("affiche le tableau lorsque le workspace tenant est actif", () => {
    mockWorkspace.mockReturnValue({
      firebaseUid: "u1",
      memberships: [{ companyId: "c1", companyName: "ACME", role: "admin" }],
      activeCompanyId: "c1",
      setActiveCompanyId: jest.fn(),
      activeRole: "admin",
      isTenantUser: true,
      refreshClaimsSilent: jest.fn(async () => true),
    });
    render(<BackOfficeDashboardPanel />);
    expect(screen.getByTestId("back-office-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("back-office-empty")).toBeInTheDocument();
    expect(screen.getByTestId("back-office-filter-company")).toBeInTheDocument();
  });
});
