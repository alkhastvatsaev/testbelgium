"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useBrowserSpeechDictation } from "./useBrowserSpeechDictation";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionPromiseRef = useRef<Promise<string> | null>(null);

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

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const generatedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(generatedBlob);
        setIsRecording(false); // Set to false only when blob is ready
        
        // Use OpenAI Whisper for highly accurate transcription
        setIsTranscribing(true);
        const promise = (async () => {
          try {
            const formData = new FormData();
            formData.append("audio", generatedBlob, "audio.webm");
            
            const res = await fetch("/api/ai/transcribe-blob", {
              method: "POST",
              body: formData,
            });
            
            const data = await res.json();
            if (data.success && data.text) {
              setTranscription(data.text);
              return data.text as string;
            } else {
              console.error("Erreur de transcription serveur:", data.error);
              return "";
            }
          } catch (error) {
            console.error("Failed to transcribe via API:", error);
            return "";
          } finally {
            setIsTranscribing(false);
          }
        })();
        transcriptionPromiseRef.current = promise;
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
    } else {
      setIsRecording(false);
    }

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
    isTranscribing,
    audioBlob,
    transcription,
    transcriptionPromise: () => transcriptionPromiseRef.current,
    startRecording,
    stopRecording,
    resetRecording,
    isDictationSupported,
    interimTranscript,
    setTranscription // Optional if they want to edit it
  };
}
