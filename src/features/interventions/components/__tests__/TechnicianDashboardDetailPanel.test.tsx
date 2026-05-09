import { render, screen } from "@testing-library/react";
import TechnicianDashboardDetailPanel from "../TechnicianDashboardDetailPanel";
import { useInterventionLive } from "@/features/interventions/useInterventionLive";
import { useTechnicianFinishJob } from "@/context/TechnicianFinishJobContext";

jest.mock("@/features/interventions/useInterventionLive");
jest.mock("@/context/TechnicianFinishJobContext");

const mockUseInterventionLive = useInterventionLive as jest.MockedFunction<typeof useInterventionLive>;
const mockUseTechnicianFinishJob = useTechnicianFinishJob as jest.MockedFunction<typeof useTechnicianFinishJob>;

describe("TechnicianDashboardDetailPanel", () => {
  beforeEach(() => {
    mockUseTechnicianFinishJob.mockReturnValue({
      finishJobInterventionId: null,
      setFinishJobInterventionId: jest.fn(),
    });
  });
  it("renders empty state when no caseId is provided", () => {
    render(<TechnicianDashboardDetailPanel caseId={null} />);
    expect(screen.getByTestId("technician-dashboard-detail-empty")).toBeInTheDocument();
  });

  it("renders loading state when liveIv is not yet loaded", () => {
    mockUseInterventionLive.mockReturnValue(null);
    render(<TechnicianDashboardDetailPanel caseId="case123" />);
    expect(screen.getByTestId("technician-dashboard-detail-loading")).toBeInTheDocument();
  });
});
