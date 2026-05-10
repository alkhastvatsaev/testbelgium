/** @jest-environment jsdom */
import type { ReactElement } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as firebaseAuth from "firebase/auth";
import { I18nProvider } from "@/core/i18n/I18nContext";
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
    pageIndex: 2,
    pageCount: 3,
    setPageIndex: jest.fn(),
    goNext: jest.fn(),
    goPrev: jest.fn(),
  }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

function renderWithI18n(ui: ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe("ClientPortalAuthPanel", () => {
  it("affiche mot de passe et lien magique", () => {
    renderWithI18n(<ClientPortalAuthPanel />);
    expect(screen.getByTestId("client-portal-container")).toBeInTheDocument();
    expect(screen.getByTestId("client-portal-password")).toBeInTheDocument();
    expect(screen.getByTestId("client-portal-password-signin")).toBeInTheDocument();
    expect(screen.getByTestId("client-portal-magic-send")).toBeInTheDocument();
  });

  it("envoie un magic link par e-mail", async () => {
    renderWithI18n(<ClientPortalAuthPanel />);
    fireEvent.change(screen.getByTestId("client-portal-email"), {
      target: { value: "client@test.example" },
    });
    fireEvent.click(screen.getByTestId("client-portal-magic-send"));
    expect(firebaseAuth.sendSignInLinkToEmail).toHaveBeenCalled();
  });

  it("appelle signInWithEmailAndPassword avec e-mail et mot de passe", async () => {
    renderWithI18n(<ClientPortalAuthPanel />);
    fireEvent.change(screen.getByTestId("client-portal-email"), {
      target: { value: "client@test.example" },
    });
    fireEvent.change(screen.getByTestId("client-portal-password"), {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByTestId("client-portal-password-signin"));
    await waitFor(() => {
      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        "client@test.example",
        "secret-pass",
      );
    });
  });
});
