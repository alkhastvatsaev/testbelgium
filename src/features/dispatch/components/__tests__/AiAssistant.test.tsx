/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AiAssistant from "../AiAssistant";

jest.mock("@/core/ui/GalaxyButton/GalaxyButton", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
      React.createElement("div", { "data-testid": "galaxy-mock", className }, children),
  };
});

jest.mock("@/core/ui/Waveform/Waveform", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: () => React.createElement("div", { "data-testid": "waveform-mock" }),
  };
});

jest.mock("@/core/config/firebase", () => ({
  firestore: {},
}));

describe("AiAssistant", () => {
  beforeAll(() => {
    class MockAudioContext {
      state: AudioContextState = "running";
      destination = {} as AudioDestinationNode;
      resume = jest.fn().mockResolvedValue(undefined);
      close = jest.fn().mockResolvedValue(undefined);
      createAnalyser = jest.fn(() => {
        const node = {
          fftSize: 256,
          smoothingTimeConstant: 0.8,
          connect: jest.fn(),
        };
        return node;
      });
      createMediaElementSource = jest.fn(() => ({ connect: jest.fn() }));
    }
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = MockAudioContext as unknown as typeof AudioContext;

    HTMLMediaElement.prototype.load = jest.fn();
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = jest.fn();
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("ai_upload_last_seen_mtime", "2020-01-01T00:00:00.000Z");
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audios: [
          {
            name: "disk.m4a",
            url: "/uploads/disk.m4a",
            createdAt: "2026-05-01T15:00:00.000Z",
            transcript: null,
          },
        ],
      }),
    });
  });

  it("affiche le play quand transcriptOverlayVisible même sans file d’attente", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audios: [] }),
    });
    render(<AiAssistant transcriptOverlayVisible />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("ai-assistant-play-toggle")).toBeInTheDocument();
  });

  it("does not show play toggle when there is no audio in queue", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audios: [] }),
    });
    render(<AiAssistant />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByTestId("ai-assistant-play-toggle")).not.toBeInTheDocument();
  });

  it("shows queue badge when a new wav appears on disk (post-transcode)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audios: [
          {
            name: "call-3312345678900-1710000000-abc.wav",
            url: "/uploads/call-3312345678900-1710000000-abc.wav",
            createdAt: "2026-05-01T15:00:00.000Z",
            transcript: null,
          },
        ],
      }),
    });
    jest.useFakeTimers({ advanceTimers: true });
    render(<AiAssistant />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-queue-badge")).toHaveTextContent("1");
    });

    jest.useRealTimers();
  });

  it("shows queue badge when a new m4a appears on disk", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    render(<AiAssistant />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-queue-badge")).toHaveTextContent("1");
    });

    jest.useRealTimers();
  });

  it("toggles play control via data-testid ai-assistant-play-toggle", async () => {
    render(<AiAssistant />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-queue-badge")).toBeInTheDocument();
    });

    const playToggle = screen.getByTestId("ai-assistant-play-toggle");

    await act(async () => {
      fireEvent.click(playToggle);
    });
    await waitFor(
      () => {
        expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
    await waitFor(
      () => {
        expect(playToggle).toHaveAttribute("aria-label", "Pause");
      },
      { timeout: 5000 },
    );

    await act(async () => {
      fireEvent.click(playToggle);
    });
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("calls onUserPressPlay when user starts playback from play toggle", async () => {
    const onUserPressPlay = jest.fn();
    render(<AiAssistant onUserPressPlay={onUserPressPlay} />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-queue-badge")).toBeInTheDocument();
    });

    onUserPressPlay.mockClear();
    const toggle = screen.getByTestId("ai-assistant-play-toggle");
    await act(async () => {
      fireEvent.click(toggle);
    });
    await waitFor(
      () => {
        expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
    await waitFor(
      () => {
        expect(toggle).toHaveAttribute("aria-label", "Pause");
      },
      { timeout: 5000 },
    );
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(onUserPressPlay).toHaveBeenCalledTimes(1);
  });

  it("n’empile pas deux entrées pour le même fichier après déplacement uploads (même basename)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audios: [
          {
            name: "disk.m4a",
            url: "/uploads/disk.m4a",
            createdAt: "2026-05-01T14:00:00.000Z",
            transcript: null,
          },
          {
            name: "M_RICHARD/disk.m4a",
            url: "/uploads/M_RICHARD/disk.m4a",
            createdAt: "2026-05-01T15:00:00.000Z",
            transcript: null,
          },
        ],
      }),
    });

    jest.useFakeTimers({ advanceTimers: true });
    render(<AiAssistant />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-queue-badge")).toHaveTextContent("1");
    });

    jest.useRealTimers();
  });
});
