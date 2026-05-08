/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardPager from "../DashboardPager";
import { DashboardPagerProvider } from "@/features/dashboard/dashboardPagerContext";

describe("DashboardPager", () => {
  function setup(pageCount = 2) {
    const pages = Array.from({ length: pageCount }, (_, i) => (
      <div key={i} data-testid={`stub-page-${i}`}>
        P{i}
      </div>
    ));
    return render(
      <DashboardPagerProvider pageCount={pageCount}>
        <DashboardPager pages={pages} />
      </DashboardPagerProvider>,
    );
  }

  it("affiche la première page et translate le track après clic sur suivant", () => {
    setup();

    expect(screen.getByTestId("stub-page-0")).toBeInTheDocument();
    const track = screen.getByTestId("dashboard-pager-track");
    expect(track.style.transform).toMatch(/translate3d\(-?0vw/);

    fireEvent.click(screen.getByTestId("dashboard-pager-next"));

    expect(track.style.transform).toContain("-100vw");
    expect(screen.getByTestId("stub-page-1")).toBeInTheDocument();
  });

  it("avec 12 pages, la translation suit l’index courant", () => {
    setup(12);
    const track = screen.getByTestId("dashboard-pager-track");

    for (let i = 0; i < 11; i++) {
      fireEvent.click(screen.getByTestId("dashboard-pager-next"));
    }

    expect(track.style.transform).toContain("-1100vw");
    expect(screen.getByTestId("dashboard-pager-next")).toBeDisabled();
    expect(screen.getByTestId("dashboard-pager-prev")).not.toBeDisabled();
  });
});
