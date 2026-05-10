import React from "react";
import { render, screen, fireEvent, waitFor } from "@/test-utils/render";
import AdminValidationPanel from "../AdminValidationPanel";
import { mockState } from "@/test-utils/mockState";
import { updateDoc, doc } from "firebase/firestore";

describe("AdminValidationPanel", () => {
  const companyId = "test-company-123";
  const uid = "tester-1";

  beforeEach(() => {
    mockState.currentUser = { uid };
    // Populate memberships so CompanyWorkspaceProvider finds the company
    mockState.firestoreData[`users/${uid}/company_memberships`] = [
      { id: companyId, companyName: "Test Company", role: "admin" }
    ];

    mockState.firestoreData["interventions"] = [
      {
        id: "iv-1",
        companyId,
        status: "done",
        clientFirstName: "John",
        clientLastName: "Doe",
        address: "123 Main St",
        problem: "Broken lock",
        createdAt: { toMillis: () => Date.now() },
      },
      {
        id: "iv-2",
        companyId,
        status: "invoiced",
        clientCompanyName: "Acme Corp",
        address: "456 Side St",
        problem: "Key stuck",
        createdAt: { toMillis: () => Date.now() - 10000 },
        ivanaVerified: true,
      }
    ];
  });

  it("renders loading state then the list of interventions", async () => {
    render(<AdminValidationPanel />, { activeCompanyId: companyId });
    
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(screen.getByText("À vérifier")).toBeInTheDocument();
    expect(screen.getByText("Vérifié")).toBeInTheDocument();
  });

  it("expands an intervention when clicked", async () => {
    render(<AdminValidationPanel />, { activeCompanyId: companyId });
    
    await waitFor(() => screen.getByText("John Doe"));
    
    fireEvent.click(screen.getByText("John Doe"));
    
    expect(screen.getByText("Broken lock")).toBeInTheDocument();
    expect(screen.getByText("Marquer comme vérifié")).toBeInTheDocument();
  });

  it("calls updateDoc when 'Marquer comme vérifié' is clicked", async () => {
    render(<AdminValidationPanel />, { activeCompanyId: companyId });
    
    await waitFor(() => screen.getByText("John Doe"));
    fireEvent.click(screen.getByText("John Doe"));
    
    const verifyBtn = screen.getByText("Marquer comme vérifié");
    fireEvent.click(verifyBtn);
    
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { ivanaVerified: true }
    );
  });

  it("shows empty state when no interventions", async () => {
    mockState.firestoreData["interventions"] = [];
    render(<AdminValidationPanel />, { activeCompanyId: companyId });
    
    await waitFor(() => {
      expect(screen.getByText("Aucun rapport")).toBeInTheDocument();
    });
  });
});
