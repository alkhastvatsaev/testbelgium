/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MapTranscriptionOverlay, {
  TRANSCRIPT_POLL_MS,
  TRANSCRIPT_REVEAL_MS_PER_CHAR,
  audioSyncedEndIndex,
  endIndexAfterWordCount,
} from "../MapTranscriptionOverlay";

/** Simule un appui sur lecture Galaxy (ouvre le calque + autorise le texte). */
const galaxyPlayProps = { playOpenSignal: 1, transcriptTextEnabled: true as const };

describe("audioSyncedEndIndex / endIndexAfterWordCount", () => {
  it("révèle par caractères si un seul token", () => {
    expect(audioSyncedEndIndex("0123456789", 5, 10)).toBe(5);
    expect(audioSyncedEndIndex("0123456789", 10, 10)).toBe(10);
  });

  it("révèle mot par mot selon la position dans la durée", () => {
    expect(endIndexAfterWordCount("aa bb cc dd", 2)).toBe(5);
    expect(audioSyncedEndIndex("aa bb cc dd", 0, 10)).toBe(0);
    expect(audioSyncedEndIndex("aa bb cc dd", 2.5, 10)).toBe(2);
  });
});

describe("MapTranscriptionOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not fetch or show overlay while armed is false", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: {
          name: "a.m4a",
          url: "/uploads/a.m4a",
          createdAt: "2026-05-01T10:00:00.000Z",
          transcript: "Hello map",
        },
        decision: { status: "none", updatedAt: null },
      }),
    });

    render(<MapTranscriptionOverlay armed={false} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByTestId("map-transcription-overlay")).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(TRANSCRIPT_POLL_MS * 2);
      await Promise.resolve();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("notifie onVisibleChange à l’affichage du calque et à la croix", async () => {
    const onVisibleChange = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: {
          name: "a.m4a",
          url: "/uploads/a.m4a",
          createdAt: "2026-05-01T10:00:00.000Z",
          transcript: "Hello map",
        },
        decision: { status: "none", updatedAt: null },
      }),
    });

    render(
      <MapTranscriptionOverlay
        armed
        onVisibleChange={onVisibleChange}
        {...galaxyPlayProps}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(onVisibleChange).toHaveBeenCalledWith(true);
    });

    fireEvent.click(screen.getByTestId("map-transcription-close"));

    await waitFor(() => {
      expect(onVisibleChange).toHaveBeenCalledWith(false);
    });
  });

  it("polls /api/ai/audio-for-url when scopedClipPublicUrl is set", async () => {
    const json = {
      audio: {
        name: "b.m4a",
        url: "/uploads/b.m4a",
        createdAt: "2026-05-01T10:00:00.000Z",
        transcript: "Scoped clip",
      },
      decision: { status: "none", updatedAt: null },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => json,
    });

    render(
      <MapTranscriptionOverlay armed {...galaxyPlayProps} scopedClipPublicUrl="/uploads/b.m4a" />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalled();
    const firstUrl = String((global.fetch as jest.Mock).mock.calls[0]?.[0] ?? "");
    expect(firstUrl).toContain("/api/ai/audio-for-url");
    expect(firstUrl).toContain(encodeURIComponent("/uploads/b.m4a"));

    await waitFor(() => {
      expect(screen.getByTestId("map-transcription-overlay")).toBeInTheDocument();
    });
  });

  it("shows latest m4a transcript and close hides until nouveau signal lecture", async () => {
    const json = {
      audio: {
        name: "a.m4a",
        url: "/uploads/a.m4a",
        createdAt: "2026-05-01T10:00:00.000Z",
        transcript: "Hello map",
      },
      decision: { status: "none", updatedAt: null },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => json,
    });

    const { rerender } = render(<MapTranscriptionOverlay armed {...galaxyPlayProps} />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("map-transcription-overlay")).toBeInTheDocument();
    });
    expect(screen.getByTestId("map-transcription-dim")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("map-transcription-close"));

    expect(screen.queryByTestId("map-transcription-overlay")).not.toBeInTheDocument();
    expect(screen.queryByTestId("map-transcription-dim")).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(TRANSCRIPT_POLL_MS);
      await Promise.resolve();
    });

    expect(screen.queryByTestId("map-transcription-overlay")).not.toBeInTheDocument();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: {
          name: "a.m4a",
          url: "/uploads/a.m4a",
          createdAt: "2026-05-01T10:00:00.000Z",
          transcript: "Updated text",
        },
        decision: { status: "none", updatedAt: null },
      }),
    });

    await act(async () => {
      jest.advanceTimersByTime(TRANSCRIPT_POLL_MS);
      await Promise.resolve();
    });

    expect(screen.queryByTestId("map-transcription-overlay")).not.toBeInTheDocument();

    rerender(<MapTranscriptionOverlay armed playOpenSignal={2} transcriptTextEnabled />);

    await waitFor(() => {
      expect(screen.getByTestId("map-transcription-overlay")).toBeInTheDocument();
    });
    expect(screen.getByTestId("map-transcription-dim")).toBeInTheDocument();
  });

  it("reveals transcript progressively word by word sans audio", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: {
          name: "a.m4a",
          url: "/uploads/a.m4a",
          createdAt: "2026-05-01T10:00:00.000Z",
          transcript: "Alpha Beta Gamma Delta Epsilon",
        },
        decision: { status: "none", updatedAt: null },
      }),
    });

    render(<MapTranscriptionOverlay armed {...galaxyPlayProps} />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("map-transcription-overlay")).toBeInTheDocument();
    });

    const text = screen.getByTestId("map-transcription-text");
    await act(async () => {
      jest.advanceTimersByTime(TRANSCRIPT_REVEAL_MS_PER_CHAR);
    });
    expect(text.textContent).toBe("Alpha");

    await act(async () => {
      jest.advanceTimersByTime(TRANSCRIPT_REVEAL_MS_PER_CHAR * 4);
    });

    expect(text.textContent).toBe("Alpha Beta Gamma Delta Epsilon");
  });

  it("reveals transcript in sync with playback when clip matches transcript URL", async () => {
    const json = {
      audio: {
        name: "a.m4a",
        url: "/uploads/a.m4a",
        createdAt: "2026-05-01T10:00:00.000Z",
        transcript: "0123456789",
      },
      decision: { status: "none", updatedAt: null },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => json,
    });

    const { rerender } = render(
      <MapTranscriptionOverlay
        armed
        {...galaxyPlayProps}
        playbackSync={{
          clipUrl: "/uploads/a.m4a",
          currentTime: 5,
          duration: 10,
          playing: true,
        }}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("map-transcription-overlay")).toBeInTheDocument();
    });

    const text = screen.getByTestId("map-transcription-text");
    expect(text.textContent).toBe("01234");

    rerender(
      <MapTranscriptionOverlay
        armed
        {...galaxyPlayProps}
        playbackSync={{
          clipUrl: "/uploads/a.m4a",
          currentTime: 10,
          duration: 10,
          playing: false,
        }}
      />
    );

    expect(text.textContent).toBe("0123456789");
  });

  it("does not show overlay when latest audio has decision refused", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: {
          name: "a.m4a",
          url: "/uploads/a.m4a",
          createdAt: "2026-05-01T10:00:00.000Z",
          transcript: "Hello",
        },
        decision: { status: "refused", updatedAt: "2026-05-01T10:01:00.000Z" },
      }),
    });

    render(<MapTranscriptionOverlay armed {...galaxyPlayProps} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByTestId("map-transcription-overlay")).not.toBeInTheDocument();
    expect(screen.queryByTestId("map-transcription-dim")).not.toBeInTheDocument();
  });

  it("n’affiche pas le texte sans transcriptTextEnabled même si armed et playOpenSignal", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: {
          name: "a.m4a",
          url: "/uploads/a.m4a",
          createdAt: "2026-05-01T10:00:00.000Z",
          transcript: "Secret",
        },
        decision: { status: "none", updatedAt: null },
      }),
    });

    render(<MapTranscriptionOverlay armed playOpenSignal={1} transcriptTextEnabled={false} />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("map-transcription-dim")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("map-transcription-text")).not.toBeInTheDocument();
  });
});
