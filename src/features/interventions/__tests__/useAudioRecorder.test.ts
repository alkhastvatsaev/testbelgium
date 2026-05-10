import { renderHook, act } from "@testing-library/react";
import { useAudioRecorder } from "../useAudioRecorder";
import { useBrowserSpeechDictation } from "../useBrowserSpeechDictation";
import { toast } from "sonner";

// Mock dependencies
jest.mock("../useBrowserSpeechDictation", () => ({
  useBrowserSpeechDictation: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

// Mock globals
let mockMediaRecorder: any;
let mockGetUserMedia: jest.Mock;
let originalFetch: any;

beforeEach(() => {
  jest.clearAllMocks();
  originalFetch = global.fetch;

  mockGetUserMedia = jest.fn().mockResolvedValue({
    getTracks: () => [{ stop: jest.fn() }],
  });

  Object.defineProperty(global.navigator, "mediaDevices", {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
  });

  mockMediaRecorder = {
    start: jest.fn(),
    stop: jest.fn(function (this: any) {
      this.state = "inactive";
      if (this.onstop) this.onstop();
    }),
    state: "inactive",
    mimeType: "audio/webm",
    ondataavailable: null,
    onstop: null,
  };

  (global as any).MediaRecorder = jest.fn().mockImplementation(() => mockMediaRecorder);
  (global as any).MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);

  // Default dictation mock
  (useBrowserSpeechDictation as jest.Mock).mockImplementation((cb) => ({
    listening: false,
    supported: true,
    toggleListening: jest.fn(),
    stop: jest.fn(),
    interimTranscript: "",
  }));
});

afterEach(() => {
    global.fetch = originalFetch;
});

describe("useAudioRecorder", () => {
  it("initializes with default state", () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.transcription).toBe("");
  });

  it("starts recording successfully", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mockMediaRecorder.start).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(true);
  });

  it("handles microphone access denial", async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error("NotAllowedError"));
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      "Accès au microphone refusé",
      expect.any(Object)
    );
  });

  it("stops recording and updates state", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    mockMediaRecorder.state = "recording";
    
    // Mock fetch for Whisper API
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ success: true, text: "Transcribed text" }),
    });

    await act(async () => {
      result.current.stopRecording();
    });

    expect(mockMediaRecorder.stop).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
    
    await act(async () => {
      await result.current.transcriptionPromise();
    });
    
    expect(result.current.transcription).toBe("Transcribed text");
  });
});
