/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { CompanyWorkspaceProvider } from "@/context/CompanyWorkspaceContext";
import DashboardSecondaryPlaceholder from "../DashboardSecondaryPlaceholder";

describe("DashboardSecondaryPlaceholder", () => {
  it("affiche le hub société en triptyque : formulaire, organisation, portail client", () => {
    render(
      <CompanyWorkspaceProvider>
        <DashboardSecondaryPlaceholder />
      </CompanyWorkspaceProvider>,
    );

    expect(screen.getByTestId("dashboard-secondary-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-left")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-center")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-secondary-panel-right")).toBeInTheDocument();
    expect(screen.getByTestId("smart-intervention-form")).toBeInTheDocument();
    expect(screen.getByTestId("company-space-panel")).toBeInTheDocument();
    const portal =
      screen.queryByTestId("client-portal-auth") ??
      screen.queryByTestId("client-portal-authed") ??
      screen.queryByTestId("client-portal-offline");
    expect(portal).toBeTruthy();
  });
});
