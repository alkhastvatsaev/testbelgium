/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { OfflineSyncProvider } from "@/context/OfflineSyncContext";
import { TechnicianFinishJobProvider } from "@/context/TechnicianFinishJobContext";
import TechnicianFinishJobPanel from "../components/TechnicianFinishJobPanel";
import { TechnicianQueryProvider } from "@/features/offline/TechnicianQueryProvider";

jest.mock("@/core/config/firebase", () => ({
  auth: { currentUser: { uid: "t1" } },
  firestore: {},
  storage: {},
  isConfigured: true,
}));

jest.mock("@/features/interventions/useInterventionLive", () => ({
  useInterventionLive: jest.fn(() => null),
}));

describe("TechnicianFinishJobPanel", () => {
  it("affiche l’état vide sans dossier sélectionné", () => {
    render(
      <TechnicianQueryProvider>
        <OfflineSyncProvider>
          <TechnicianFinishJobProvider>
            <TechnicianFinishJobPanel />
          </TechnicianFinishJobProvider>
        </OfflineSyncProvider>
      </TechnicianQueryProvider>,
    );
    expect(screen.getByTestId("finish-job-empty")).toBeInTheDocument();
  });
});
