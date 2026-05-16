import { fireEvent, waitFor } from "@testing-library/react";
import { updateDoc } from "firebase/firestore";
import { render, screen } from "@/test-utils/render";
import type { Intervention } from "@/features/interventions/types";
import TechnicianAssignmentOfferCard from "@/features/interventions/components/TechnicianAssignmentOfferCard";

const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

function assignmentIv(partial: Partial<Intervention> = {}): Intervention {
  return {
    id: "iv-offer-1",
    title: "Chaudière",
    address: "Rue test 1",
    time: "10:00",
    status: "assigned",
    assignedTechnicianUid: "demo-tech-local",
    clientFirstName: "Jean",
    clientLastName: "Martin",
    location: { lat: 50.8, lng: 4.35 },
    scheduledDate: "2026-05-16",
    scheduledTime: "11:00",
    ...partial,
  };
}

describe("TechnicianAssignmentOfferCard", () => {
  beforeEach(() => {
    mockUpdateDoc.mockClear();
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it("renders offer actions for assigned mission", () => {
    render(
      <TechnicianAssignmentOfferCard
        iv={assignmentIv()}
        index={0}
        isSelected={false}
        technicianUid="demo-tech-local"
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId("technician-assignment-offer-iv-offer-1")).toBeInTheDocument();
    expect(screen.getByTestId("technician-assignment-accept")).toBeInTheDocument();
    expect(screen.getByTestId("technician-assignment-decline")).toBeInTheDocument();
  });

  it("accept writes en_route patch to Firestore", async () => {
    render(
      <TechnicianAssignmentOfferCard
        iv={assignmentIv()}
        index={0}
        isSelected={false}
        technicianUid="demo-tech-local"
        onSelect={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("technician-assignment-accept"));

    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledTimes(1));
    const [, patch] = mockUpdateDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(patch.status).toBe("en_route");
    expect(typeof patch.technicianAcceptedAt).toBe("string");
  });

  it("decline resets dossier to pending", async () => {
    render(
      <TechnicianAssignmentOfferCard
        iv={assignmentIv()}
        index={0}
        isSelected={false}
        technicianUid="demo-tech-local"
        onSelect={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("technician-assignment-decline"));

    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledTimes(1));
    const [, patch] = mockUpdateDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(patch.status).toBe("pending");
    expect(patch.assignedTechnicianUid).toBeNull();
    expect(patch.technicianDeclinedByUid).toBe("demo-tech-local");
    expect(typeof patch.technicianDeclinedAt).toBe("string");
  });
});
