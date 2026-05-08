/** @jest-environment jsdom */
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  GalaxyLayerBridgeProvider,
  useGalaxyLayerBridge,
  type GalaxyCreatedMission,
} from "../GalaxyLayerBridgeContext";

function wrapper({ children }: { children: ReactNode }) {
  return <GalaxyLayerBridgeProvider>{children}</GalaxyLayerBridgeProvider>;
}

describe("GalaxyLayerBridgeContext", () => {
  it("relie emitInterventionCreated au consumer enregistré", () => {
    const received: GalaxyCreatedMission[] = [];
    const { result } = renderHook(
      () => {
        const b = useGalaxyLayerBridge();
        return b;
      },
      { wrapper },
    );

    act(() => {
      result.current.registerInterventionConsumer((m) => received.push(m));
    });

    const mission: GalaxyCreatedMission = {
      id: 1,
      key: "k",
      clientName: "Test",
      coordinates: [4.35, 50.84],
      time: "10:00",
      status: "Nouveau",
    };

    act(() => {
      result.current.emitInterventionCreated(mission);
    });

    expect(received).toEqual([mission]);
  });

  it("armTranscription passe transcriptionArmed à true", () => {
    const { result } = renderHook(() => useGalaxyLayerBridge(), { wrapper });

    expect(result.current.transcriptionArmed).toBe(false);
    act(() => result.current.armTranscription());
    expect(result.current.transcriptionArmed).toBe(true);
  });
});
