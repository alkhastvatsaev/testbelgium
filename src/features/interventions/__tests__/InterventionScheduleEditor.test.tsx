/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import type { Intervention } from "@/features/interventions/types";
import InterventionScheduleEditor from "../components/InterventionScheduleEditor";

jest.mock("@/core/config/firebase", () => ({
  auth: { currentUser: { uid: "admin-1" } },
  firestore: {},
  isConfigured: true,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), message: jest.fn() },
}));

describe("InterventionScheduleEditor", () => {
  const iv: Intervention = {
    id: "iv1",
    title: "Cas",
    address: "Rue A",
    time: "",
    status: "pending",
    location: { lat: 0, lng: 0 },
    scheduledDate: "2026-08-01",
    scheduledTime: "11:00",
  };

  it("affiche les exports pour un créneau existant (non-admin)", () => {
    render(<InterventionScheduleEditor intervention={iv} isAdmin={false} />);
    expect(screen.getByTestId("intervention-schedule-google")).toHaveAttribute("href", expect.stringMatching(/calendar\.google/));
    expect(screen.getByTestId("intervention-schedule-outlook")).toHaveAttribute("href", expect.stringMatching(/outlook\.office/));
  });

  it("affiche les champs date/heure pour un admin", () => {
    render(<InterventionScheduleEditor intervention={iv} isAdmin />);
    expect(screen.getByTestId("intervention-schedule-date")).toBeInTheDocument();
    expect(screen.getByTestId("intervention-schedule-time")).toBeInTheDocument();
    expect(screen.getByTestId("intervention-schedule-save")).toBeInTheDocument();
  });

  it("ne rend rien pour non-admin sans créneau", () => {
    const bare: Intervention = { ...iv, scheduledDate: "", scheduledTime: "" };
    const { container } = render(<InterventionScheduleEditor intervention={bare} isAdmin={false} />);
    expect(container.firstChild).toBeNull();
  });
});
