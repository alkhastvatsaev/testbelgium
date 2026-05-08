/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { RequesterHubProvider, useRequesterHub } from "../context/RequesterHubContext";

function Harness() {
  const { profile, requestData, setProfile, setRequestData, resetRequestOnly } = useRequesterHub();

  return (
    <div>
      <span data-testid="first-name">{profile.firstName || "empty"}</span>
      <span data-testid="problem">{requestData.problemLabel || "empty"}</span>
      <button
        type="button"
        onClick={() => {
          setProfile((prev) => ({ ...prev, firstName: "Nora" }));
          setRequestData((prev) => ({ ...prev, problemLabel: "Porte bloquée" }));
        }}
      >
        Remplir
      </button>
      <button type="button" onClick={resetRequestOnly}>
        Vider demande
      </button>
    </div>
  );
}

describe("RequesterHubContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("vide la demande sans effacer le profil demandeur", () => {
    render(
      <RequesterHubProvider>
        <Harness />
      </RequesterHubProvider>,
    );

    fireEvent.click(screen.getByText("Remplir"));
    expect(screen.getByTestId("first-name")).toHaveTextContent("Nora");
    expect(screen.getByTestId("problem")).toHaveTextContent("Porte bloquée");

    fireEvent.click(screen.getByText("Vider demande"));
    expect(screen.getByTestId("first-name")).toHaveTextContent("Nora");
    expect(screen.getByTestId("problem")).toHaveTextContent("empty");
  });
});
