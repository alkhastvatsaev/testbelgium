"use client";

import MapGalaxyTranscriptionLayer from "@/features/map/components/MapGalaxyTranscriptionLayer";
import { useGalaxyLayerBridge } from "@/features/map/GalaxyLayerBridgeContext";

/** Rendu dans `#dashboard-galaxy-dock` — même largeur que `#map-container` (colonne centre). */
export default function DashboardGalaxyLayer() {
  const { transcriptionArmed, armTranscription, emitInterventionCreated } = useGalaxyLayerBridge();

  return (
    <MapGalaxyTranscriptionLayer
      transcriptionArmed={transcriptionArmed}
      onUserPressPlay={armTranscription}
      onInterventionCreated={emitInterventionCreated}
    />
  );
}
