"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useBrowserSpeechDictation } from "./useBrowserSpeechDictation";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Use the existing speech dictation for the transcription part
  const {
    listening: isDictating,
    supported: isDictationSupported,
    toggleListening,
    stop: stopDictation,
    interimTranscript,
  } = useBrowserSpeechDictation((text) => {
    setTranscription((prev) => (prev ? prev + " " + text : text));
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscription(""); // Reset transcription on new recording

      // Start dictation if not already started
      if (isDictationSupported && !isDictating) {
        // useBrowserSpeechDictation toggleListening starts it. Wait, toggleListening doesn't take params
        // but toggleListening toggles. So if it's not dictating, calling toggleListening will start it.
        toggleListening();
      }
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Accès au microphone refusé", {
        description: "Veuillez autoriser l'accès au microphone pour enregistrer un message vocal.",
      });
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop()); // Stop all tracks to release mic
    }
    setIsRecording(false);

    // Stop dictation
    if (isDictating) {
      stopDictation();
    }
  }, [isDictating, stopDictation]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setTranscription("");
  }, []);

  return {
    isRecording,
    audioBlob,
    transcription,
    startRecording,
    stopRecording,
    resetRecording,
    isDictationSupported,
    interimTranscript,
    setTranscription // Optional if they want to edit it
  };
}
