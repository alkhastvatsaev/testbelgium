import fs from "fs";
import path from "path";
import * as admin from "firebase-admin";
import "@/core/config/firebase-admin";
import { transcodeFileToWavBuffer } from "@/core/services/audio/ffmpeg-wav-buffer";
import { transcrireAppelSerrurier } from "@/core/services/audio/transcription";
import type { AudioUploadSidecar, SynthesizedTranscription } from "@/core/services/audio/transcription.types";
import type { PendingUploadJob } from "@/core/services/audio/process-upload-jobs";
import { writeAudioUploadSidecar } from "@/core/services/audio/transcript-sidecar";
import { guessClientFolderNameFromText, moveUploadBundleIntoClientFolder } from "@/core/services/audio/upload-organization";

export type RunProcessUploadJobParams = {
  uploadsDir: string;
  job: PendingUploadJob;
  source: AudioUploadSidecar["source"];
  /** Priorité sur l’extraction `call-{phone}-...` dans le nom de fichier (ex. `?phone=` audio-dispatch). */
  dispatchPhone?: string | null;
};

export type RunProcessUploadJobResult = {
  publicUrl: string;
  audioFileName: string;
  analysis: SynthesizedTranscription;
  rawTranscript: string;
  processedAt: string;
  jobCanonicalInitial: string;
};

function errorAnalysis(message: string): SynthesizedTranscription {
  return {
    transcription: `Erreur de traitement: ${message}`,
    probleme: null,
    adresse: null,
    urgence: false,
    est_serrurerie: false,
  };
}

/**
 * Transcode / STT / rangement client + sidecar + Firestore `ai_status/macrodroid`.
 * Utilisé par `process-uploads` et, en asynchrone, par `audio-dispatch` après envoi MacroDroid.
 */
export async function runProcessUploadJob(params: RunProcessUploadJobParams): Promise<RunProcessUploadJobResult> {
  const { uploadsDir, job, source, dispatchPhone } = params;

  let ext = path.extname(job.canonical) || ".m4a";
  let savedPath = path.join(uploadsDir, job.canonical);
  const receivedAt = fs.statSync(savedPath).mtime.toISOString();
  const buffer = fs.readFileSync(savedPath);
  const lower = job.canonical.toLowerCase();

  let bufferForStt = buffer;
  let nameForStt = job.canonical;
  let transcodedToWavForStt = false;
  let analysis: SynthesizedTranscription;
  let rawTranscript: string;
  const processedAt = new Date().toISOString();
  let clientFolder = "Unknown";
  let finalRelativeFileName = job.canonical;

  try {
    if (!lower.endsWith(".mp3") && !lower.endsWith(".wav")) {
      const wavBuf = transcodeFileToWavBuffer(savedPath);
      if (wavBuf) {
        const oldSavedPath = savedPath;
        bufferForStt = Buffer.from(wavBuf);
        nameForStt = `${job.stem}.wav`;
        transcodedToWavForStt = true;

        ext = ".wav";
        finalRelativeFileName = `${job.stem}${ext}`;
        savedPath = path.join(uploadsDir, finalRelativeFileName);
        fs.writeFileSync(savedPath, bufferForStt);

        if (oldSavedPath !== savedPath && fs.existsSync(oldSavedPath)) {
          fs.unlinkSync(oldSavedPath);
        }
      }
    }

    const result = await transcrireAppelSerrurier(bufferForStt, nameForStt);
    analysis = result.analysis;
    rawTranscript = result.rawTranscript;
    clientFolder = guessClientFolderNameFromText(analysis.transcription || rawTranscript || "");
  } catch (sttError) {
    console.error("[runProcessUploadJob] Erreur transcription:", job.canonical, sttError);
    const errorMsg = sttError instanceof Error ? sttError.message : String(sttError);
    analysis = errorAnalysis(errorMsg);
    rawTranscript = `[Erreur] L'IA n'a pas pu traiter ce fichier. ${errorMsg}`;
    clientFolder = "Errors";
  }

  const moved = moveUploadBundleIntoClientFolder({
    uploadsDir,
    relativeAudioFileName: finalRelativeFileName,
    clientFolderName: clientFolder,
  });
  const publicUrl = `/uploads/${moved.newRelativeAudioFileName}`;

  let extractedPhone: string | null = dispatchPhone?.trim() ? dispatchPhone.trim() : null;
  if (!extractedPhone) {
    const parts = job.canonical.split("-");
    if (parts.length >= 4 && parts[0] === "call") {
      extractedPhone = parts[1] !== "unknown" ? parts[1] : null;
    }
  }

  writeAudioUploadSidecar(publicUrl, {
    schemaVersion: 1,
    audioFileName: moved.newRelativeAudioFileName,
    publicUrl,
    phone: extractedPhone,
    receivedAt,
    processedAt,
    source,
    openai: {
      transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "gpt-4o-transcribe",
      dispatchModel: process.env.OPENAI_DISPATCH_MODEL?.trim() || "gpt-4o-mini",
    },
    rawTranscript,
    audio: {
      sizeBytes: buffer.length,
      clientOriginalFileName: job.canonical,
      storedRelativePath: `uploads/${moved.newRelativeAudioFileName}`,
      transcodedToWavForStt,
    },
    analysis,
  });

  try {
    if (admin.apps.length) {
      const db = admin.firestore();
      await db
        .collection("ai_status")
        .doc("macrodroid")
        .set(
          {
            status: "ready",
            phone: extractedPhone,
            transcript: analysis.transcription,
            audioUrl: publicUrl,
            updatedAt: processedAt,
            lastProcessedAt: processedAt,
          },
          { merge: true }
        );
    }
  } catch (e) {
    console.warn("[runProcessUploadJob] Firestore:", e);
  }

  return {
    publicUrl,
    audioFileName: moved.newRelativeAudioFileName,
    analysis,
    rawTranscript,
    processedAt,
    jobCanonicalInitial: job.canonical,
  };
}
