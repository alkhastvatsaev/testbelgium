import { fireEvent, waitFor } from "@testing-library/react";
import { updateDoc } from "firebase/firestore";
import { render, screen } from "@/test-utils/render";
import { useCompanyWorkspaceOptional } from "@/context/CompanyWorkspaceContext";
import { useBackOfficeInterventions } from "@/features/backoffice/useBackOfficeInterventions";
import { getDefaultAssignedTechnicianUid } from "@/features/interventions/defaultAssignedTechnicianUid";
import type { Intervention } from "@/features/interventions/types";
import IncomingClientRequestsPanel from "@/features/backoffice/components/IncomingClientRequestsPanel";

const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockWorkspace = useCompanyWorkspaceOptional as jest.MockedFunction<
  typeof useCompanyWorkspaceOptional
>;
const mockUseBackOffice = useBackOfficeInterventions as jest.MockedFunction<
  typeof useBackOfficeInterventions
>;

jest.mock("@/context/CompanyWorkspaceContext", () => ({
  useCompanyWorkspaceOptional: jest.fn(),
}));

jest.mock("@/features/backoffice/useBackOfficeInterventions", () => ({
  useBackOfficeInterventions: jest.fn(),
}));

jest.mock("@/features/backoffice/useResolvedInterventionAudio", () => ({
  useResolvedInterventionAudio: jest.fn(() => ({ resolvedAudioUrl: null })),
}));

const pendingRequest: Intervention = {
  id: "req-1",
  title: "Fuite cuisine",
  address: "Rue de la Loi 1, Bruxelles",
  time: "10:00",
  status: "pending",
  location: { lat: 50.84, lng: 4.35 },
  clientFirstName: "Marie",
  clientLastName: "Dupont",
  createdAt: "2026-05-16T09:00:00.000Z",
};

function mockTenantWorkspace() {
  mockWorkspace.mockReturnValue({
    isTenantUser: true,
    activeCompanyId: "co-1",
    memberships: [{ companyId: "co-1", role: "owner" }],
  } as ReturnType<typeof useCompanyWorkspaceOptional>);
}

describe("IncomingClientRequestsPanel", () => {
  beforeEach(() => {
    mockUpdateDoc.mockClear();
    mockUpdateDoc.mockResolvedValue(undefined);
    mockTenantWorkspace();
    mockUseBackOffice.mockReturnValue({
      interventions: [pendingRequest],
      loading: false,
    });
  });

  it("shows gate when workspace is not a tenant", () => {
    mockWorkspace.mockReturnValue({
      isTenantUser: false,
      activeCompanyId: null,
      memberships: [],
    } as ReturnType<typeof useCompanyWorkspaceOptional>);

    render(<IncomingClientRequestsPanel />);

    expect(screen.getByTestId("incoming-requests-gate")).toBeInTheDocument();
    expect(screen.queryByTestId("incoming-requests-panel")).not.toBeInTheDocument();
  });

  it("assign writes status assigned with default technician uid", async () => {
    render(<IncomingClientRequestsPanel />);

    fireEvent.click(screen.getByTestId("incoming-request-card-req-1"));
    fireEvent.click(screen.getByTestId("incoming-request-assign"));

    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledTimes(1));
    const [, patch] = mockUpdateDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(patch.status).toBe("assigned");
    expect(patch.assignedTechnicianUid).toBe(getDefaultAssignedTechnicianUid());
    expect(patch.scheduledDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(patch.scheduledTime).toMatch(/^\d{2}:\d{2}$/);
  });
});
