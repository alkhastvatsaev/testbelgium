/** @jest-environment jsdom */
import { screen } from "@testing-library/react";
import { renderWithPager } from "@/test-utils/renderWithPager";
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
  return renderWithPager(
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
  return renderWithPager(
    <CompanyWorkspaceProvider>
      <BackOfficeHubPage slotIndex={BACKOFFICE_HUB_PAGE_INDEX} />
    </CompanyWorkspaceProvider>,
  );
}

import { I18nProvider } from "@/core/i18n/I18nContext";

describe("Dashboard hub pages", () => {
  it("hub société : trois colonnes avec formulaire, organisation et portail client", () => {
    renderWithPager(
      <I18nProvider>
        <CompanyWorkspaceProvider>
          <CompanyHubPage />
        </CompanyWorkspaceProvider>
      </I18nProvider>,
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
    expect(screen.getByTestId("technician-dashboard-list")).toBeInTheDocument();
    expect(screen.getByTestId("technician-dashboard-detail-empty")).toBeInTheDocument();
    expect(screen.getByTestId("technician-dashboard-images-empty")).toBeInTheDocument();
  });

  it("hub back-office : doublons, tableau temps réel et calendrier", () => {
    renderBackOfficeHub();

    expect(screen.getByTestId(`dashboard-pager-slot-${BACKOFFICE_HUB_PAGE_INDEX}`)).toBeInTheDocument();
    expect(screen.getByTestId("incoming-requests-gate")).toBeInTheDocument();
    expect(screen.getByTestId("back-office-gate")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-integration-gate")).toBeInTheDocument();
  });
});
