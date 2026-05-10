/** @jest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { getDownloadURL } from "firebase/storage";
import type { Intervention } from "@/features/interventions/types";
import { readAudioUrl, useResolvedInterventionAudio } from "../useResolvedInterventionAudio";

jest.mock("firebase/storage", () => ({
  getDownloadURL: jest.fn(),
  ref: jest.fn(() => ({})),
}));

const getDownloadURLMock = getDownloadURL as jest.MockedFunction<typeof getDownloadURL>;

describe("useResolvedInterventionAudio", () => {
  beforeEach(() => {
    getDownloadURLMock.mockReset();
  });

  it("readAudioUrl lit audioUrl", () => {
    expect(readAudioUrl({ audioUrl: "  https://x.test/a.webm  " })).toBe("  https://x.test/a.webm  ");
  });

  it("expose l'URL directe sans appeler Storage", async () => {
    const iv = {
      id: "1",
      title: "t",
      address: "a",
      time: "",
      status: "pending" as const,
      location: { lat: 0, lng: 0 },
      audioUrl: "https://example.com/v.webm",
    } satisfies Intervention;

    const { result } = renderHook(() => useResolvedInterventionAudio(iv));

    await waitFor(() => {
      expect(result.current.resolvedAudioUrl).toBe("https://example.com/v.webm");
    });
    expect(result.current.isResolvingAudio).toBe(false);
    expect(result.current.audioStorageResolveFailed).toBe(false);
    expect(getDownloadURLMock).not.toHaveBeenCalled();
  });

  it("résout audioStoragePath via getDownloadURL quand il n'y a pas d'URL directe", async () => {
    getDownloadURLMock.mockResolvedValue("https://storage.example.com/signed");

    const iv = {
      id: "2",
      title: "t",
      address: "a",
      time: "",
      status: "done" as const,
      location: { lat: 0, lng: 0 },
      audioStoragePath: "client-audios/demo.webm",
    } satisfies Intervention;

    const { result } = renderHook(() => useResolvedInterventionAudio(iv));

    await waitFor(() => {
      expect(result.current.resolvedAudioUrl).toBe("https://storage.example.com/signed");
    });
    expect(result.current.audioStorageResolveFailed).toBe(false);
    expect(getDownloadURLMock).toHaveBeenCalledTimes(1);
  });
});
