/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  TechnicianBackofficeReportBridgeProvider,
  useTechnicianBackofficeReportBridgeOptional,
} from "../TechnicianBackofficeReportBridgeContext";

describe("TechnicianBackofficeReportBridgeContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("pushReport puis affichage côté consommateur", async () => {
    function TestConsumer() {
      const bridge = useTechnicianBackofficeReportBridgeOptional();
      return (
        <div>
          <span data-testid="count">{bridge?.reports.length ?? 0}</span>
          <button
            type="button"
            data-testid="push"
            onClick={() =>
              bridge?.pushReport({
                interventionId: "iv-123",
                photoDataUrls: ["data:image/jpeg;base64,xx"],
                signaturePngDataUrl: "data:image/png;base64,yy",
              })
            }
          >
            push
          </button>
        </div>
      );
    }

    render(
      <TechnicianBackofficeReportBridgeProvider>
        <TestConsumer />
      </TechnicianBackofficeReportBridgeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });
    fireEvent.click(screen.getByTestId("push"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("ne log pas de warning act au montage", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    function TestConsumer() {
      const bridge = useTechnicianBackofficeReportBridgeOptional();
      return <span data-testid="count">{bridge?.reports.length ?? 0}</span>;
    }

    render(
      <TechnicianBackofficeReportBridgeProvider>
        <TestConsumer />
      </TechnicianBackofficeReportBridgeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("count")).toBeInTheDocument();
    });

    expect(spy.mock.calls.some((c) => String(c[0] ?? "").includes("not wrapped in act"))).toBe(false);

    spy.mockRestore();
  });
});
