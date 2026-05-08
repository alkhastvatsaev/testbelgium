/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import * as firebaseAuth from "firebase/auth";
import ClientPortalAuthPanel from "../ClientPortalAuthPanel";

jest.mock("@/core/config/firebase", () => ({
  auth: {
    currentUser: null,
  },
  firestore: {},
  isConfigured: true,
}));

jest.mock("@/features/dashboard/dashboardPagerContext", () => ({
  useDashboardPagerOptional: () => ({
    pageIndex: 3,
    pageCount: 4,
    setPageIndex: jest.fn(),
    goNext: jest.fn(),
    goPrev: jest.fn(),
  }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

describe("ClientPortalAuthPanel", () => {
  it("affiche lien magique + SSO Google / Microsoft", () => {
    render(<ClientPortalAuthPanel />);
    expect(screen.getByTestId("client-portal-auth")).toBeInTheDocument();
    expect(screen.getByTestId("client-portal-google")).toBeInTheDocument();
    expect(screen.getByTestId("client-portal-microsoft")).toBeInTheDocument();
    expect(screen.getByTestId("client-portal-magic-send")).toBeInTheDocument();
  });

  it("envoie un magic link par e-mail", async () => {
    render(<ClientPortalAuthPanel />);
    fireEvent.change(screen.getByTestId("client-portal-email"), {
      target: { value: "client@test.example" },
    });
    fireEvent.click(screen.getByTestId("client-portal-magic-send"));
    expect(firebaseAuth.sendSignInLinkToEmail).toHaveBeenCalled();
  });
});
