/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import DashboardPagerControls from "../DashboardPagerControls";
import { DashboardPagerProvider } from "@/features/dashboard/dashboardPagerContext";

function renderControls(pageCount = 2) {
  return render(
    <DashboardPagerProvider pageCount={pageCount}>
      <DashboardPagerControls />
    </DashboardPagerProvider>,
  );
}

describe("DashboardPagerControls", () => {
  it("affiche suivant actif et précédent désactivé sur la première page", () => {
    renderControls();

    expect(screen.getByTestId("dashboard-pager-next")).not.toBeDisabled();
    expect(screen.getByTestId("dashboard-pager-prev")).toBeDisabled();
    expect(screen.getByTestId("dashboard-pager-next")).toHaveAttribute(
      "aria-label",
      "Aller à la deuxième page",
    );
    expect(screen.queryByTestId("dashboard-pages-menu-open")).not.toBeInTheDocument();
  });

  it("permet d’avancer puis de revenir avec précédent", () => {
    renderControls(12);

    fireEvent.click(screen.getByTestId("dashboard-pager-next"));
    expect(screen.getByTestId("dashboard-pager-prev")).not.toBeDisabled();
    expect(screen.getByTestId("dashboard-pager-next")).not.toBeDisabled();

    fireEvent.click(screen.getByTestId("dashboard-pager-prev"));
    expect(screen.getByTestId("dashboard-pager-prev")).toBeDisabled();
  });

  it("désactive suivant sur la dernière page", () => {
    renderControls(3);

    fireEvent.click(screen.getByTestId("dashboard-pager-next"));
    fireEvent.click(screen.getByTestId("dashboard-pager-next"));

    expect(screen.getByTestId("dashboard-pager-next")).toBeDisabled();
    expect(screen.getByTestId("dashboard-pager-prev")).not.toBeDisabled();
  });
});
