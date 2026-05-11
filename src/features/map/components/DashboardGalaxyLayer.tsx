"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import MapGalaxyTranscriptionLayer from "@/features/map/components/MapGalaxyTranscriptionLayer";
import { useGalaxyLayerBridge } from "@/features/map/GalaxyLayerBridgeContext";

/**
 * Bandeau Galaxy + overlays transcription : monté via un Portal pour rester visible 
 * au-dessus de tout le dashboard (Pager, etc.) sur toutes les pages.
 */
export default function DashboardGalaxyLayer() {
  const { transcriptionArmed, armTranscription, emitInterventionCreated } = useGalaxyLayerBridge();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <MapGalaxyTranscriptionLayer
      transcriptionArmed={transcriptionArmed}
      onUserPressPlay={armTranscription}
      onInterventionCreated={emitInterventionCreated}
    />,
    document.body
  );
}
