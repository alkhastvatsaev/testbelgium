/** @jest-environment jsdom */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithPager } from "@/test-utils/renderWithPager";
import { CompanyWorkspaceProvider } from "@/context/CompanyWorkspaceContext";
import CompanyHubPage from "@/features/company/components/CompanyHubPage";
import { OfflineSyncProvider } from "@/context/OfflineSyncContext";
import { TechnicianCaseIntentProvider } from "@/context/TechnicianCaseIntentContext";
import { TechnicianFinishJobProvider } from "@/context/TechnicianFinishJobContext";
import BackOfficeHubPage from "@/features/backoffice/components/BackOfficeHubPage";
import TechnicianHubPage from "@/features/interventions/components/TechnicianHubPage";
import { TECHNICIAN_HUB_SLOT_INDEX } from "@/features/interventions/technicianDashboardConstants";
import { TechnicianQueryProvider } from "@/features/offline/TechnicianQueryProvider";
import { RequesterHubProvider } from "@/features/interventions/context/RequesterHubContext";

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

/** Slot arbitraire : le hub back-office n’est plus monté dans le carrousel réel. */
const BACKOFFICE_HUB_TEST_SLOT = 0;

function renderBackOfficeHub() {
  return renderWithPager(
    <CompanyWorkspaceProvider>
      <BackOfficeHubPage slotIndex={BACKOFFICE_HUB_TEST_SLOT} />
    </CompanyWorkspaceProvider>,
    3,
  );
}

import { I18nProvider } from "@/core/i18n/I18nContext";

describe("Dashboard hub pages", () => {
  it("hub société : trois colonnes avec formulaire, organisation et portail client", () => {
    renderWithPager(
      <I18nProvider>
        <RequesterHubProvider>
          <CompanyWorkspaceProvider>
            <CompanyHubPage />
          </CompanyWorkspaceProvider>
        </RequesterHubProvider>
      </I18nProvider>,
    );

    expect(screen.getByTestId("dashboard-secondary-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-left")).toBeInTheDocument();
    expect(screen.getByTestId("company-hub-rail-demande")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-center")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-right")).toBeInTheDocument();
    expect(screen.getByTestId("requester-profile-panel")).toBeInTheDocument();
    expect(screen.getByTestId("requester-intervention-panel")).toBeInTheDocument();
    expect(screen.getByTestId("company-hub-rail-portail")).toBeInTheDocument();
    expect(screen.getByTestId("company-hub-right-tab-tracking")).toBeInTheDocument();
    expect(screen.getByTestId("company-hub-right-tab-chat")).toBeInTheDocument();
    expect(screen.getByTestId("requester-tracking-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("company-hub-right-tab-chat"));
    expect(screen.getByTestId("ivana-client-chat-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("requester-tracking-panel")).not.toBeInTheDocument();
  });

  it("hub technicien : triptyque avec périmètre terrain complet", () => {
    renderTechnicianHub();

    expect(screen.getByTestId(`dashboard-pager-slot-${TECHNICIAN_HUB_SLOT_INDEX}`)).toBeInTheDocument();
    expect(screen.getByTestId("technician-dashboard-list")).toBeInTheDocument();
    expect(screen.getByTestId("technician-dashboard-detail-empty")).toBeInTheDocument();
    expect(screen.getByTestId("technician-dashboard-images-empty")).toBeInTheDocument();
  });

  it("hub technicien : clôture en calque sur le panneau central (pas de modale plein écran)", () => {
    renderWithPager(
      <TechnicianQueryProvider>
        <OfflineSyncProvider>
          <TechnicianCaseIntentProvider>
            <TechnicianFinishJobProvider initialFinishJobInterventionId="iv-test-finish-layer">
              <TechnicianHubPage slotIndex={TECHNICIAN_HUB_SLOT_INDEX} />
            </TechnicianFinishJobProvider>
          </TechnicianCaseIntentProvider>
        </OfflineSyncProvider>
      </TechnicianQueryProvider>,
    );

    expect(screen.getByTestId("technician-finish-job-layer")).toBeInTheDocument();
    expect(screen.getByTestId("finish-job-panel")).toBeInTheDocument();
  });

  it("hub back-office (composant isolé) : demandes entrantes, tableau et calendrier", () => {
    renderBackOfficeHub();

    expect(screen.getByTestId(`dashboard-pager-slot-${BACKOFFICE_HUB_TEST_SLOT}`)).toBeInTheDocument();
    expect(screen.getByTestId("incoming-requests-gate")).toBeInTheDocument();
    expect(screen.getByTestId("back-office-gate")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-integration-gate")).toBeInTheDocument();
  });
});
