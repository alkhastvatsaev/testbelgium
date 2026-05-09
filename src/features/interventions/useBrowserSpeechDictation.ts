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
 * Enregistre également l'audio via `MediaRecorder` et appelle `onAudioRecorded` à la fin.
 */
export function useBrowserSpeechDictation(appendTranscript: (text: string) => void, onAudioRecorded?: (blob: Blob) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recRef = useRef<SpeechRec | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const appendRef = useRef(appendTranscript);
  appendRef.current = appendTranscript;

  const onAudioRecordedRef = useRef(onAudioRecorded);
  onAudioRecordedRef.current = onAudioRecorded;

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

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    setListening(false);
    setInterimTranscript("");
  }, []);

  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    },
    [],
  );

  const toggleListening = useCallback(async () => {
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        onAudioRecordedRef.current?.(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      toast.error("Accès au micro refusé.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "fr-BE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let currentInterim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const row = event.results[i];
        const piece = row[0]?.transcript;
        if (!piece) continue;

        if (row.isFinal) {
          appendRef.current(piece.trim());
        } else {
          currentInterim += piece;
        }
      }
      setInterimTranscript(currentInterim);
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setListening(false);
      setInterimTranscript("");
    };
    recognition.onend = () => {
      recRef.current = null;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setListening(false);
      setInterimTranscript("");
    };

    recRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setInterimTranscript("");
    } catch {
      toast.error("Impossible de démarrer le micro");
      recRef.current = null;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setListening(false);
    }
  }, [listening, stop]);

  return { listening, supported, toggleListening, stop, interimTranscript };
}
