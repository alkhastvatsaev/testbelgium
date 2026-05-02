/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import MacroDroidIndicator from "../MacroDroidIndicator";

const mockOnSnapshot = jest.fn();

jest.mock("@/core/config/firebase", () => ({
  firestore: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => ({ path: "ai_status/macrodroid" })),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

describe("MacroDroidIndicator", () => {
  beforeEach(() => {
    mockOnSnapshot.mockReset();
    sessionStorage.clear();
  });

  it("affiche la transcription quand Firestore envoie status ready + lastProcessedAt", () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: (snap: { exists: () => boolean; data: () => Record<string, unknown> }) => void) => {
      cb({
        exists: () => true,
        data: () => ({
          status: "ready",
          transcript: "Client bloqué à Ixelles",
          lastProcessedAt: "2026-05-02T12:00:00.000Z",
        }),
      });
      return jest.fn();
    });

    render(<MacroDroidIndicator />);

    expect(screen.getByText(/Client bloqué à Ixelles/)).toBeInTheDocument();
    expect(screen.getByText(/RÉSULTAT TRANSCRIPTION/)).toBeInTheDocument();
  });

  it("ferme le panneau pendant status processing (nouvel upload)", () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: (snap: { exists: () => boolean; data: () => Record<string, unknown> }) => void) => {
      cb({
        exists: () => true,
        data: () => ({
          status: "processing",
          transcript: "",
          phone: null,
        }),
      });
      return jest.fn();
    });

    render(<MacroDroidIndicator />);

    expect(screen.queryByText(/RÉSULTAT TRANSCRIPTION/)).not.toBeInTheDocument();
  });

  it("n’affiche pas deux fois le même lastProcessedAt (sessionStorage)", () => {
    sessionStorage.setItem("belgmap_macrodroid_last_processed_at", "2026-05-02T12:00:00.000Z");

    mockOnSnapshot.mockImplementation((_ref: unknown, cb: (snap: { exists: () => boolean; data: () => Record<string, unknown> }) => void) => {
      cb({
        exists: () => true,
        data: () => ({
          status: "ready",
          transcript: "Même texte",
          lastProcessedAt: "2026-05-02T12:00:00.000Z",
        }),
      });
      return jest.fn();
    });

    render(<MacroDroidIndicator />);

    expect(screen.queryByText(/RÉSULTAT TRANSCRIPTION/)).not.toBeInTheDocument();
  });
});
