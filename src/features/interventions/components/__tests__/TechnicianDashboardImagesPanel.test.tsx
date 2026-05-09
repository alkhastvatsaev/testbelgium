import { render, screen } from "@testing-library/react";
import TechnicianDashboardImagesPanel from "../TechnicianDashboardImagesPanel";
import { useInterventionLive } from "@/features/interventions/useInterventionLive";

jest.mock("@/features/interventions/useInterventionLive");

const mockUseInterventionLive = useInterventionLive as jest.MockedFunction<typeof useInterventionLive>;

describe("TechnicianDashboardImagesPanel", () => {
  it("renders empty state when no caseId is provided", () => {
    render(<TechnicianDashboardImagesPanel caseId={null} />);
    expect(screen.getByTestId("technician-dashboard-images-empty")).toBeInTheDocument();
  });

  it("renders loading state when liveIv is not yet loaded", () => {
    mockUseInterventionLive.mockReturnValue(null);
    render(<TechnicianDashboardImagesPanel caseId="case123" />);
    expect(screen.getByTestId("technician-dashboard-images-loading")).toBeInTheDocument();
  });

  it("renders empty photos state when liveIv has no attachments", () => {
    mockUseInterventionLive.mockReturnValue({
      id: "case123",
      title: "Test",
      address: "123 Test St",
      time: "10:00",
      status: "pending",
      location: { lat: 0, lng: 0 },
      attachmentThumbnails: [],
    });
    render(<TechnicianDashboardImagesPanel caseId="case123" />);
    expect(screen.getByTestId("technician-dashboard-images")).toBeInTheDocument();
    expect(screen.getByText("Aucune photo fournie par le client")).toBeInTheDocument();
  });

  it("renders photos when liveIv has attachments", () => {
    mockUseInterventionLive.mockReturnValue({
      id: "case123",
      title: "Test",
      address: "123 Test St",
      time: "10:00",
      status: "pending",
      location: { lat: 0, lng: 0 },
      attachmentThumbnails: ["http://example.com/photo1.jpg", "http://example.com/photo2.jpg"],
    });
    render(<TechnicianDashboardImagesPanel caseId="case123" />);
    expect(screen.getByTestId("technician-dashboard-images")).toBeInTheDocument();
    expect(screen.getAllByAltText(/Photo client/i)).toHaveLength(2);
  });
});
