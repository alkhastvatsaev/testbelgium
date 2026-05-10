/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import {
  TechnicianBackofficeReportBridgeProvider,
  useTechnicianBackofficeReportBridgeOptional,
} from "../TechnicianBackofficeReportBridgeContext";

describe("TechnicianBackofficeReportBridgeContext", () => {
  it("pushReport puis affichage côté consommateur", () => {
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

    expect(screen.getByTestId("count")).toHaveTextContent("0");
    fireEvent.click(screen.getByTestId("push"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });
});
