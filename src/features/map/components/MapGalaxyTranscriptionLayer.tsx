"use client";

import React, { useCallback, useEffect, useState } from "react";
import AiAssistant, { type AiPlaybackSync } from "@/features/dispatch/components/AiAssistant";
import MapTranscriptionOverlay from "@/features/map/components/MapTranscriptionOverlay";
import MapTranscriptionActionsPanel from "@/features/map/components/MapTranscriptionActionsPanel";

type Props = {
  transcriptionArmed: boolean;
  onUserPressPlay: () => void;
  onInterventionCreated?: (mission: { id: number; key: string; clientName: string; coordinates: [number, number]; time: string; status: string; source?: "live"; date?: string }) => void;
};

/**
 * Isole l’état `playbackSync` (~60 Hz) pour ne pas re-rendre MapboxView / la carte à chaque frame.
 */
export default function MapGalaxyTranscriptionLayer({ transcriptionArmed, onUserPressPlay, onInterventionCreated }: Props) {
  const [playbackSync, setPlaybackSync] = useState<AiPlaybackSync>(null);
  const [openEditSignal, setOpenEditSignal] = useState(0);
  const [transcriptOverlayOpen, setTranscriptOverlayOpen] = useState(false);
  /** N’est passé à `true` qu’après un appui sur lecture Galaxy — l’auto-play ne montre pas le texte. */
  const [transcriptTextEnabled, setTranscriptTextEnabled] = useState(false);
  /** Clip en cours dans la file AiAssistant — pour ne pas afficher le « dernier » fichier disque par erreur. */
  const [activeClipPublicUrl, setActiveClipPublicUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!transcriptionArmed) setActiveClipPublicUrl(null);
  }, [transcriptionArmed]);

  /**
   * AiAssistant envoie `null` quand la file est vide (ex. fin du dernier clip) : ne pas effacer,
   * sinon transcription + formulaire disparaissent alors que l’utilisateur n’a pas quitté la session.
   */
  const onActiveClipFromAssistant = useCallback((url: string | null) => {
    const t = url?.trim() ?? "";
    if (!t) return;
    setActiveClipPublicUrl(t);
  }, []);

  const onTranscriptVisible = useCallback((visible: boolean) => {
    setTranscriptOverlayOpen(visible);
    if (!visible) setTranscriptTextEnabled(false);
  }, []);

  return (
    <>
      <MapTranscriptionOverlay
        armed={transcriptionArmed}
        playOpenSignal={openEditSignal}
        transcriptTextEnabled={transcriptTextEnabled}
        playbackSync={playbackSync}
        onVisibleChange={onTranscriptVisible}
        scopedClipPublicUrl={activeClipPublicUrl}
      />
      <MapTranscriptionActionsPanel
        armed={transcriptionArmed}
        onInterventionCreated={onInterventionCreated}
        openEditSignal={openEditSignal}
        scopedClipPublicUrl={activeClipPublicUrl}
      />
      <AiAssistant
        transcriptOverlayVisible={transcriptOverlayOpen}
        onActiveClipUrlChange={onActiveClipFromAssistant}
        onUserPressPlay={() => {
          onUserPressPlay();
          setTranscriptTextEnabled(true);
          setOpenEditSignal((v) => v + 1);
        }}
        onPlaybackSync={setPlaybackSync}
      />
    </>
  );
}
