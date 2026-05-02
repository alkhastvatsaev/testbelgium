/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MapTranscriptionActionsPanel from "../MapTranscriptionActionsPanel";

describe("MapTranscriptionActionsPanel", () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("is hidden when not armed", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: {
          name: "a.m4a",
          url: "/uploads/a.m4a",
          createdAt: "2026-05-01T10:00:00.000Z",
          transcript: "Hello",
        },
        decision: { status: "none", updatedAt: null },
      }),
    });

    render(<MapTranscriptionActionsPanel armed={false} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId("map-transcription-edit")).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("avec scopedClipPublicUrl, poll audio-for-url", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: {
          name: "x.m4a",
          url: "/uploads/x.m4a",
          createdAt: "2026-05-01T10:00:00.000Z",
          transcript: "Hello",
        },
        decision: { status: "none", updatedAt: null },
      }),
    });

    render(<MapTranscriptionActionsPanel armed scopedClipPublicUrl="/uploads/x.m4a" />);
    await act(async () => {
      await Promise.resolve();
    });

    const firstUrl = String((global.fetch as jest.Mock).mock.calls[0]?.[0] ?? "");
    expect(firstUrl).toContain("/api/ai/audio-for-url");
    expect(firstUrl).toContain(encodeURIComponent("/uploads/x.m4a"));
  });

  it("shows when armed + transcript + decision none", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: {
          name: "a.m4a",
          url: "/uploads/a.m4a",
          createdAt: "2026-05-01T10:00:00.000Z",
          transcript: "Hello",
        },
        decision: { status: "none", updatedAt: null },
      }),
    });

    render(<MapTranscriptionActionsPanel armed />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByTestId("map-transcription-edit")).not.toBeInTheDocument();
    });
  });

  it("Créer envoie from-audio", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio: {
            name: "a.m4a",
            url: "/uploads/a.m4a",
            createdAt: "2026-05-01T10:00:00.000Z",
            transcript: "Hello",
          },
          decision: { status: "none", updatedAt: null },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<MapTranscriptionActionsPanel armed openEditSignal={1} />);
    await waitFor(() => {
      expect(screen.getByTestId("map-transcription-edit")).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByTestId("edit-clientName"), { target: { value: "Client" } });
    fireEvent.change(screen.getByTestId("edit-phone"), { target: { value: "0499001122" } });
    fireEvent.change(screen.getByTestId("edit-address"), { target: { value: "Addr" } });
    fireEvent.change(screen.getByTestId("edit-problem"), { target: { value: "Porte" } });
    fireEvent.change(screen.getByTestId("edit-date"), { target: { value: "2026-05-02" } });
    fireEvent.change(screen.getByTestId("edit-time"), { target: { value: "10:30" } });

    fireEvent.click(screen.getByTestId("edit-create"));

    await act(async () => {
      await Promise.resolve();
    });

    // creation endpoint called
    expect((global.fetch as jest.Mock).mock.calls.some((c: unknown[]) => c[0] === "/api/interventions/from-audio")).toBe(
      true
    );
  });

  it("ne réinitialise pas le formulaire quand latest-audio repoll (saisie manuelle)", async () => {
    const payload = {
      audio: {
        name: "a.m4a",
        url: "/uploads/a.m4a",
        createdAt: "2026-05-01T10:00:00.000Z",
        transcript: "Bonjour je suis Monsieur Test",
        meta: {
          analysis: {
            transcription: "Bonjour je suis Monsieur Test",
            adresse: "Rue A",
            probleme: "Serrure",
            urgence: false,
          },
          phone: "",
          rawTranscript: "Bonjour je suis Monsieur Test",
          receivedAt: "2026-05-01T10:00:00.000Z",
        },
      },
      decision: { status: "none", updatedAt: null },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    render(<MapTranscriptionActionsPanel armed openEditSignal={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("map-transcription-edit")).toBeInTheDocument();
    });

    const nameInput = screen.getByTestId("edit-clientName") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "M. Dupont saisi à la main" } });
    expect(nameInput.value).toBe("M. Dupont saisi à la main");

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId("edit-clientName")).toHaveValue("M. Dupont saisi à la main");
  });

  it("Supprimer envoie audio-decision refused", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audio: {
            name: "a.m4a",
            url: "/uploads/a.m4a",
            createdAt: "2026-05-01T10:00:00.000Z",
            transcript: "Hello",
          },
          decision: { status: "none", updatedAt: null },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

    render(<MapTranscriptionActionsPanel armed openEditSignal={1} />);
    await waitFor(() => {
      expect(screen.getByTestId("map-transcription-edit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-delete"));

    await act(async () => {
      await Promise.resolve();
    });

    const decisionCall = (global.fetch as jest.Mock).mock.calls.find((c: unknown[]) => c[0] === "/api/ai/audio-decision");
    expect(decisionCall).toBeDefined();
    expect(JSON.parse(String((decisionCall![1] as { body?: string }).body))).toEqual(
      expect.objectContaining({ fileName: "a.m4a", status: "refused" }),
    );
  });
});

