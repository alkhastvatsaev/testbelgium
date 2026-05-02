/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import MapGalaxyTranscriptionLayer from "../MapGalaxyTranscriptionLayer";

jest.mock("@/features/dispatch/components/AiAssistant", () => ({
  __esModule: true,
  default: function MockAi() {
    return <div data-testid="ai-assistant-mock" />;
  },
}));

jest.mock("../MapTranscriptionOverlay", () => ({
  __esModule: true,
  default: function MockOverlay() {
    return <div data-testid="map-transcription-overlay-mock" />;
  },
}));

jest.mock("../MapTranscriptionActionsPanel", () => ({
  __esModule: true,
  default: function MockActions() {
    return <div data-testid="map-transcription-actions-mock" />;
  },
}));

describe("MapGalaxyTranscriptionLayer", () => {
  it("renders overlay and assistant", () => {
    render(
      <MapGalaxyTranscriptionLayer transcriptionArmed={false} onUserPressPlay={() => {}} />
    );
    expect(screen.getByTestId("map-transcription-overlay-mock")).toBeInTheDocument();
    expect(screen.getByTestId("map-transcription-actions-mock")).toBeInTheDocument();
    expect(screen.getByTestId("ai-assistant-mock")).toBeInTheDocument();
  });
});
