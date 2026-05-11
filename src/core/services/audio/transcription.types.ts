export interface SynthesizedTranscription {
  transcription: string;
  probleme: string | null;
  adresse: string | null;
  urgence: boolean;
  est_serrurerie: boolean;
}

/** Sortie complète du pipeline (STT + extraction JSON métier) */
export interface TranscriptionPipelineResult {
  analysis: SynthesizedTranscription;
  /** Texte sorti du modèle audio (avant l’étape « dispatch » JSON) */
  rawTranscript: string;
}

/** Métadonnées + analyse stockées à côté de l’audio : `mon-fichier.m4a` → `mon-fichier.audio.json` */
export interface AudioUploadSidecar {
  schemaVersion: 1;
  audioFileName: string;
  publicUrl: string;
  phone: string | null;
  /** Moment où le fichier a été enregistré sur le disque (ISO 8601) */
  receivedAt: string;
  /** Fin du traitement OpenAI (ISO 8601) */
  processedAt: string;
  source: "audio-dispatch" | "api-transcribe" | "upload-auto";
  openai?: {
    transcriptionModel: string;
    dispatchModel: string;
  };
  /** Transcription STT brute (Copie dans le JSON pour audit / rejeu) */
  rawTranscript?: string;
  /** Détails sur le fichier audio côté serveur */
  audio?: {
    sizeBytes: number;
    /** Nom fichier côté client (MacroDroid, etc.) si connu */
    clientOriginalFileName: string | null;
    storedRelativePath: string;
    transcodedToWavForStt: boolean;
  };
  analysis: SynthesizedTranscription;
}
