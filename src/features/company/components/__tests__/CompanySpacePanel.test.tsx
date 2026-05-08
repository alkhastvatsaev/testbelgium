/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { CompanyWorkspaceProvider } from "@/context/CompanyWorkspaceContext";
import CompanySpacePanel from "../CompanySpacePanel";

jest.mock("@/core/config/firebase", () => ({
  auth: null,
  firestore: null,
  isConfigured: false,
}));

describe("CompanySpacePanel", () => {
  it("affiche l’état indisponible sans texte visible (glyphe + aria)", () => {
    render(
      <CompanyWorkspaceProvider>
        <CompanySpacePanel />
      </CompanyWorkspaceProvider>,
    );
    expect(screen.getByTestId("company-space-panel")).toBeInTheDocument();
    expect(screen.getByTestId("company-panel-offline")).toBeInTheDocument();
    expect(screen.getByLabelText(/Firebase non configuré/i)).toBeInTheDocument();
  });
});
