"use client";

import MapGalaxyTranscriptionLayer from "@/features/map/components/MapGalaxyTranscriptionLayer";
import { useGalaxyLayerBridge } from "@/features/map/GalaxyLayerBridgeContext";

/**
 * Bandeau Galaxy + overlays transcription : monté hors du pager pour rester visible sur toutes les pages.
 */
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
