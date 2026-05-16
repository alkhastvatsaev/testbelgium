import type { Intervention } from "@/features/interventions/types";
import { DEMO_TECHNICIAN_UID } from "@/core/config/devUiPreview";
import { getDefaultAssignedTechnicianUid } from "@/features/interventions/defaultAssignedTechnicianUid";
import {
  acceptTechnicianAssignmentPatch,
  declineTechnicianAssignmentPatch,
  getTechnicianAssignmentUid,
  isTechnicianAssignmentAwaitingResponse,
  matchesAssignedTechnician,
} from "@/features/interventions/technicianAssignmentActions";

function iv(
  partial: Partial<Intervention> & Pick<Intervention, "status">,
): Intervention {
  return {
    id: "x",
    title: "Test",
    address: "Rue test",
    time: "10:00",
    location: { lat: 50.8, lng: 4.35 },
    ...partial,
  };
}

describe("technicianAssignmentActions", () => {
  it("detects assignment awaiting technician response", () => {
    expect(
      isTechnicianAssignmentAwaitingResponse(
        iv({ status: "assigned", assignedTechnicianUid: "tech-1" }),
        "tech-1",
      ),
    ).toBe(true);
    expect(
      isTechnicianAssignmentAwaitingResponse(
        iv({ status: "assigned", assignedTechnicianUid: "tech-2" }),
        "tech-1",
      ),
    ).toBe(false);
    expect(
      isTechnicianAssignmentAwaitingResponse(
        iv({ status: "en_route", assignedTechnicianUid: "tech-1" }),
        "tech-1",
      ),
    ).toBe(false);
  });

  it("accept moves to en_route", () => {
    const patch = acceptTechnicianAssignmentPatch(new Date("2026-05-16T12:00:00Z"));
    expect(patch.status).toBe("en_route");
    expect(patch.technicianAcceptedAt).toBe("2026-05-16T12:00:00.000Z");
  });

  it("getTechnicianAssignmentUid uses auth uid outside dev preview (NODE_ENV=test)", () => {
    expect(getTechnicianAssignmentUid("tech-42")).toBe("tech-42");
    expect(getTechnicianAssignmentUid(null)).toBeNull();
  });

  it("treats legacy in_progress without acceptance as awaiting response", () => {
    expect(
      isTechnicianAssignmentAwaitingResponse(
        iv({
          status: "in_progress",
          assignedTechnicianUid: "tech-1",
          technicianAcceptedAt: null,
        }),
        "tech-1",
      ),
    ).toBe(true);
  });

  it("matches default back-office technician uid in demo", () => {
    const defaultUid = getDefaultAssignedTechnicianUid();
    expect(
      matchesAssignedTechnician(
        iv({ status: "assigned", assignedTechnicianUid: defaultUid }),
        DEMO_TECHNICIAN_UID,
      ),
    ).toBe(true);
  });

  it("decline returns dossier to IVANA pending queue", () => {
    const patch = declineTechnicianAssignmentPatch(
      "tech-1",
      new Date("2026-05-16T12:00:00Z"),
    );
    expect(patch.status).toBe("pending");
    expect(patch.assignedTechnicianUid).toBeNull();
    expect(patch.technicianDeclinedByUid).toBe("tech-1");
  });
});
