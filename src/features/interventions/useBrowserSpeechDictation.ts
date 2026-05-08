"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type SpeechResultList = {
  length: number;
  item: (index: number) => { isFinal: boolean; 0: { transcript: string } };
  [index: number]: { isFinal: boolean; 0: { transcript: string } };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechResultList;
};

type SpeechRecognitionErrorLike = { error?: string };

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Dictée navigateur (Web Speech API). Ajoute du texte via `appendTranscript`.
 */
export function useBrowserSpeechDictation(appendTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const appendRef = useRef(appendTranscript);
  appendRef.current = appendTranscript;

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
    }
    recRef.current = null;
    setListening(false);
  }, []);

  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    },
    [],
  );

  const toggleListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error("Dictée vocale indisponible", {
        description: "Utilisez Chrome, Edge ou Safari récent, ou saisissez au clavier.",
      });
      return;
    }
    if (listening) {
      stop();
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "fr-BE";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const row = event.results[i];
        if (!row?.isFinal) continue;
        const piece = row[0]?.transcript?.trim();
        if (piece) appendRef.current(piece);
      }
    };
    recognition.onerror = (ev: SpeechRecognitionErrorLike) => {
      const err = ev.error;
      if (err === "no-speech" || err === "aborted") return;
      if (err === "not-allowed") {
        toast.error("Micro refusé", { description: "Autorisez le micro pour ce site dans les paramètres du navigateur." });
      } else {
        toast.message("Dictée", { description: "Micro arrêté ou indisponible." });
      }
      recRef.current = null;
      setListening(false);
    };
    recognition.onend = () => {
      recRef.current = null;
      setListening(false);
    };

    recRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      toast.error("Impossible de démarrer le micro");
      recRef.current = null;
      setListening(false);
    }
  }, [listening, stop]);

  return { listening, supported, toggleListening, stop };
}
