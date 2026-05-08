/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import CompanySpacePanel from "../CompanySpacePanel";
import { COMPANY_HUB_PAGE_INDEX } from "@/features/company/companyHubConstants";

const mockSetPageIndex = jest.fn();

jest.mock("@/features/dashboard/dashboardPagerContext", () => ({
  useDashboardPagerOptional: () => ({
    pageIndex: 1,
    pageCount: 4,
    setPageIndex: mockSetPageIndex,
    goNext: jest.fn(),
    goPrev: jest.fn(),
  }),
}));

jest.mock("@/context/CompanyWorkspaceContext", () => ({
  CompanyWorkspaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCompanyWorkspace: () => ({
    firebaseUid: "u1",
    memberships: [{ companyId: "c1", companyName: "Acme", role: "collaborateur" as const }],
    activeCompanyId: "c1",
    setActiveCompanyId: jest.fn(),
    activeRole: "collaborateur" as const,
    refreshClaimsSilent: jest.fn(),
    isTenantUser: true,
  }),
}));

jest.mock("@/core/config/firebase", () => ({
  auth: { currentUser: { uid: "u1", getIdToken: jest.fn() } },
  firestore: {},
  isConfigured: true,
}));

describe("CompanySpacePanel — raccourci demande d’intervention", () => {
  beforeEach(() => {
    mockSetPageIndex.mockClear();
  });

  it("appelle setPageIndex pour afficher le hub société puis faire défiler vers le formulaire", () => {
    render(<CompanySpacePanel />);
    fireEvent.click(screen.getByTestId("company-open-intervention-form-btn"));
    expect(mockSetPageIndex).toHaveBeenCalledTimes(1);
    expect(mockSetPageIndex).toHaveBeenCalledWith(COMPANY_HUB_PAGE_INDEX);
  });
});
