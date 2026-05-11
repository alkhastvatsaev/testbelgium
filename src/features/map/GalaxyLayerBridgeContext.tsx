"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Payload émis quand une intervention est créée depuis la couche Galaxy / transcription. */
export type GalaxyCreatedMission = {
  id: number;
  key: string;
  clientName: string;
  coordinates: [number, number];
  time: string;
  status: string;
  source?: "live";
  date?: string;
};

type GalaxyLayerBridgeCtx = {
  transcriptionArmed: boolean;
  armTranscription: () => void;
  emitInterventionCreated: (mission: GalaxyCreatedMission) => void;
  registerInterventionConsumer: (fn: ((m: GalaxyCreatedMission) => void) | null) => void;
};

const GalaxyLayerBridgeContext = createContext<GalaxyLayerBridgeCtx | null>(null);

export function GalaxyLayerBridgeProvider({ children }: { children: ReactNode }) {
  const [transcriptionArmed, setTranscriptionArmed] = useState(false);
  const consumerRef = useRef<((m: GalaxyCreatedMission) => void) | null>(null);

  const armTranscription = useCallback(() => setTranscriptionArmed(true), []);

  const registerInterventionConsumer = useCallback(
    (fn: ((m: GalaxyCreatedMission) => void) | null) => {
      consumerRef.current = fn;
    },
    [],
  );

  const emitInterventionCreated = useCallback((mission: GalaxyCreatedMission) => {
    consumerRef.current?.(mission);
  }, []);

  const value = useMemo(
    () => ({
      transcriptionArmed,
      armTranscription,
      emitInterventionCreated,
      registerInterventionConsumer,
    }),
    [transcriptionArmed, armTranscription, emitInterventionCreated, registerInterventionConsumer],
  );

  return (
    <GalaxyLayerBridgeContext.Provider value={value}>{children}</GalaxyLayerBridgeContext.Provider>
  );
}

export function useGalaxyLayerBridge(): GalaxyLayerBridgeCtx {
  const ctx = useContext(GalaxyLayerBridgeContext);
  if (!ctx) throw new Error("GalaxyLayerBridgeProvider manquant.");
  return ctx;
}

export function useGalaxyLayerBridgeOptional(): GalaxyLayerBridgeCtx | null {
  return useContext(GalaxyLayerBridgeContext);
}
