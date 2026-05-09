import { render, screen } from "@testing-library/react";
import TechnicianDashboardListPanel from "../TechnicianDashboardListPanel";
import { useTechnicianAssignments } from "@/features/interventions/useTechnicianAssignments";

jest.mock("@/features/interventions/useTechnicianAssignments");

const mockUseTechnicianAssignments = useTechnicianAssignments as jest.MockedFunction<typeof useTechnicianAssignments>;

describe("TechnicianDashboardListPanel", () => {
  it("renders loading state", () => {
    mockUseTechnicianAssignments.mockReturnValue({
      interventions: [],
      loading: true,
      error: null,
      firebaseUid: "user123",
    });

    render(<TechnicianDashboardListPanel selectedCaseId={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId("technician-dashboard-loading")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    mockUseTechnicianAssignments.mockReturnValue({
      interventions: [],
      loading: false,
      error: null,
      firebaseUid: "user123",
    });

    render(<TechnicianDashboardListPanel selectedCaseId={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId("technician-dashboard-empty")).toBeInTheDocument();
  });
});
