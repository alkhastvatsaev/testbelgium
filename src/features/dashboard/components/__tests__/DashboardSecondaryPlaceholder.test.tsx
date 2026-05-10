/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/core/i18n/I18nContext";
import { CompanyWorkspaceProvider } from "@/context/CompanyWorkspaceContext";
import { RequesterHubProvider } from "@/features/interventions/context/RequesterHubContext";
import DashboardSecondaryPlaceholder from "../DashboardSecondaryPlaceholder";

describe("DashboardSecondaryPlaceholder", () => {
  it("affiche le hub société en triptyque : demandeur, formulaire, portail (suivi + chat)", () => {
    render(
      <I18nProvider>
        <RequesterHubProvider>
          <CompanyWorkspaceProvider>
            <DashboardSecondaryPlaceholder />
          </CompanyWorkspaceProvider>
        </RequesterHubProvider>
      </I18nProvider>,
    );

    expect(screen.getByTestId("dashboard-secondary-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-left")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-center")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-right")).toBeInTheDocument();
    expect(screen.getByTestId("company-hub-rail-demande")).toBeInTheDocument();
    expect(screen.getByTestId("requester-profile-panel")).toBeInTheDocument();
    expect(screen.getByTestId("requester-intervention-panel")).toBeInTheDocument();
    expect(screen.getByTestId("company-hub-rail-portail")).toBeInTheDocument();
    expect(screen.getByTestId("company-hub-right-tab-tracking")).toBeInTheDocument();
    expect(screen.getByTestId("company-hub-right-tab-chat")).toBeInTheDocument();
  });
});
