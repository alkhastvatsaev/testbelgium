/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { CompanyWorkspaceProvider } from "@/context/CompanyWorkspaceContext";
import CompanyHubPage from "@/features/company/components/CompanyHubPage";
import { OfflineSyncProvider } from "@/context/OfflineSyncContext";
import { TechnicianCaseIntentProvider } from "@/context/TechnicianCaseIntentContext";
import { TechnicianFinishJobProvider } from "@/context/TechnicianFinishJobContext";
import { BACKOFFICE_HUB_PAGE_INDEX } from "@/features/backoffice/backofficeConstants";
import BackOfficeHubPage from "@/features/backoffice/components/BackOfficeHubPage";
import TechnicianHubPage from "@/features/interventions/components/TechnicianHubPage";
import { TECHNICIAN_HUB_SLOT_INDEX } from "@/features/interventions/technicianDashboardConstants";
import { TechnicianQueryProvider } from "@/features/offline/TechnicianQueryProvider";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), message: jest.fn(), warning: jest.fn() },
}));

function renderTechnicianHub() {
  return render(
    <TechnicianQueryProvider>
      <OfflineSyncProvider>
        <TechnicianCaseIntentProvider>
          <TechnicianFinishJobProvider>
            <TechnicianHubPage slotIndex={TECHNICIAN_HUB_SLOT_INDEX} />
          </TechnicianFinishJobProvider>
        </TechnicianCaseIntentProvider>
      </OfflineSyncProvider>
    </TechnicianQueryProvider>,
  );
}

function renderBackOfficeHub() {
  return render(
    <CompanyWorkspaceProvider>
      <BackOfficeHubPage slotIndex={BACKOFFICE_HUB_PAGE_INDEX} />
    </CompanyWorkspaceProvider>,
  );
}

describe("Dashboard hub pages", () => {
  it("hub société : trois colonnes avec formulaire, organisation et portail client", () => {
    render(
      <CompanyWorkspaceProvider>
        <CompanyHubPage />
      </CompanyWorkspaceProvider>,
    );

    expect(screen.getByTestId("dashboard-secondary-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-left")).toBeInTheDocument();
    expect(screen.getByTestId("company-hub-rail-demande")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-center")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-right")).toBeInTheDocument();
    expect(screen.getByTestId("requester-profile-panel")).toBeInTheDocument();
    expect(screen.getByTestId("requester-intervention-panel")).toBeInTheDocument();
    expect(screen.getByTestId("requester-tracking-panel")).toBeInTheDocument();
  });

  it("hub technicien : triptyque avec périmètre terrain complet", () => {
    renderTechnicianHub();

    expect(screen.getByTestId(`dashboard-pager-slot-${TECHNICIAN_HUB_SLOT_INDEX}`)).toBeInTheDocument();
    expect(screen.getByTestId("technician-offline-sync-panel")).toBeInTheDocument();
    expect(screen.getByTestId("technician-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("finish-job-empty")).toBeInTheDocument();
    expect(screen.getByTestId("technician-push-panel")).toBeInTheDocument();
    expect(screen.getByTestId("technician-invoice-automation-panel")).toBeInTheDocument();
  });

  it("hub back-office : doublons, tableau temps réel et calendrier", () => {
    renderBackOfficeHub();

    expect(screen.getByTestId(`dashboard-pager-slot-${BACKOFFICE_HUB_PAGE_INDEX}`)).toBeInTheDocument();
    expect(screen.getByTestId("duplicate-alerts-gate")).toBeInTheDocument();
    expect(screen.getByTestId("back-office-gate")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-integration-gate")).toBeInTheDocument();
  });
});
