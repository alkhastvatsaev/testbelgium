/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import DuplicateAlertsQueue from "../components/DuplicateAlertsQueue";
import type { DuplicateAlertRow } from "@/features/interventions/duplicateAlertTypes";

describe("DuplicateAlertsQueue", () => {
  const alert: DuplicateAlertRow = {
    id: "new-case",
    companyId: "c1",
    newInterventionId: "new-case",
    similarInterventionId: "old-case",
    similarAddress: "Rue de la Loi 16",
    similarProblemPreview: "Porte bloquée",
    similarCreatedAt: new Date().toISOString(),
    status: "open",
    createdByUid: "u1",
    detectedAt: new Date().toISOString(),
  };

  it("affiche les actions fusion / ignorer pour un admin", () => {
    render(<DuplicateAlertsQueue openAlerts={[alert]} isAdmin variant="compact" />);
    expect(screen.getByTestId("duplicate-alert-banner-new-case")).toBeInTheDocument();
    expect(screen.getByTestId("duplicate-alert-merge-new-case")).toBeInTheDocument();
    expect(screen.getByTestId("duplicate-alert-ignore-new-case")).toBeInTheDocument();
  });

  it("masque les actions pour un non-admin", () => {
    render(<DuplicateAlertsQueue openAlerts={[alert]} isAdmin={false} variant="compact" />);
    expect(screen.queryByTestId("duplicate-alert-merge-new-case")).not.toBeInTheDocument();
    expect(screen.getByText(/Admin uniquement/i)).toBeInTheDocument();
  });
});
