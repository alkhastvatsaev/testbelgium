/** @jest-environment jsdom */
import React from "react";
import { render, screen, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompanyWorkspaceProvider, useCompanyWorkspace } from "@/context/CompanyWorkspaceContext";
import { useTechnicianAssignments } from "@/features/interventions/useTechnicianAssignments";

jest.mock("@/core/config/devUiPreview", () => ({
  devUiPreviewEnabled: true,
  DEMO_COMPANY_ID: "demo-local-company",
  DEMO_TECHNICIAN_UID: "demo-tech-local",
}));

jest.mock("@/core/config/firebase", () => ({
  auth: null,
  firestore: null,
  isConfigured: false,
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
}));

function WorkspaceConsumer() {
  const ws = useCompanyWorkspace();
  return (
    <div>
      <span data-testid="demo-active-company">{ws.activeCompanyId}</span>
      <span data-testid="demo-is-tenant">{ws.isTenantUser ? "yes" : "no"}</span>
    </div>
  );
}

describe("CompanyWorkspaceProvider (mode démo UI)", () => {
  it("expose une société et un périmètre tenant fictifs sans Firebase", async () => {
    render(
      <CompanyWorkspaceProvider>
        <WorkspaceConsumer />
      </CompanyWorkspaceProvider>,
    );
    expect(await screen.findByTestId("demo-active-company")).toHaveTextContent("demo-local-company");
    expect(screen.getByTestId("demo-is-tenant")).toHaveTextContent("yes");
  });
});

describe("useTechnicianAssignments (mode démo UI)", () => {
  it("retourne les interventions démo sans Firestore", async () => {
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useTechnicianAssignments(), { wrapper });
    await waitFor(() => {
      expect(result.current.interventions.length).toBeGreaterThan(0);
    });
    expect(result.current.firebaseUid).toBe("demo-tech-local");
    expect(result.current.loading).toBe(false);
  });
});
