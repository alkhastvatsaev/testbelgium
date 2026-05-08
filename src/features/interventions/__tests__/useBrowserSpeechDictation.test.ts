/** @jest-environment jsdom */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBrowserSpeechDictation } from "../useBrowserSpeechDictation";

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), message: jest.fn() },
}));

type RecognitionLike = {
  lang: string;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: jest.Mock;
  stop: jest.Mock;
  abort: jest.Mock;
};

type SpeechResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    item: (index: number) => { isFinal: boolean; 0: { transcript: string } };
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
};

type SpeechRecognitionCtor = new () => RecognitionLike;

describe("useBrowserSpeechDictation", () => {
  const win = window as Window & { SpeechRecognition?: SpeechRecognitionCtor };
  const originalSR = win.SpeechRecognition;

  let lastInstance: RecognitionLike | null = null;

  beforeEach(() => {
    lastInstance = null;
    win.SpeechRecognition = class {
      lang = "";
      continuous = false;
      interimResults = false;
      onresult: ((e: SpeechResultEvent) => void) | null = null;
      onerror: ((e: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start = jest.fn();
      stop = jest.fn();
      abort = jest.fn();
      constructor() {
        lastInstance = this;
      }
    } as unknown as SpeechRecognitionCtor;
  });

  afterEach(() => {
    win.SpeechRecognition = originalSR;
  });

  it("signale le support après montage lorsque SpeechRecognition existe", async () => {
    const { result } = renderHook(() => useBrowserSpeechDictation(jest.fn()));

    await waitFor(() => {
      expect(result.current.supported).toBe(true);
    });
  });

  it("démarre la reconnaissance au premier appui sur toggle", async () => {
    const { result } = renderHook(() => useBrowserSpeechDictation(jest.fn()));

    await waitFor(() => {
      expect(result.current.supported).toBe(true);
    });

    act(() => {
      result.current.toggleListening();
    });

    expect(lastInstance?.start).toHaveBeenCalledTimes(1);
    expect(result.current.listening).toBe(true);
  });

  it("ajoute le texte des résultats finaux via appendTranscript", async () => {
    const append = jest.fn();
    const { result } = renderHook(() => useBrowserSpeechDictation(append));

    await waitFor(() => {
      expect(result.current.supported).toBe(true);
    });

    act(() => {
      result.current.toggleListening();
    });

    const rec = lastInstance;
    expect(rec?.onresult).toBeTruthy();

    const row0 = { isFinal: true, 0: { transcript: "  porte bloquée  " } };
    const event: SpeechResultEvent = {
      resultIndex: 0,
      results: {
        length: 1,
        0: row0,
        item: (i) => (i === 0 ? row0 : row0),
      },
    };

    act(() => {
      rec!.onresult!(event);
    });

    expect(append).toHaveBeenCalledWith("porte bloquée");
  });

  it("stop coupe l’écoute", async () => {
    const { result } = renderHook(() => useBrowserSpeechDictation(jest.fn()));

    await waitFor(() => {
      expect(result.current.supported).toBe(true);
    });

    act(() => {
      result.current.toggleListening();
    });

    act(() => {
      result.current.stop();
    });

    expect(lastInstance?.stop).toHaveBeenCalled();
    expect(result.current.listening).toBe(false);
  });
});
