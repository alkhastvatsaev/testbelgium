import OpenAI, { toFile } from "openai";
import type { SynthesizedTranscription, TranscriptionPipelineResult } from "./transcription.types";

export type { SynthesizedTranscription, TranscriptionPipelineResult } from "./transcription.types";

const STRUCTURED_SYSTEM = `Tu es un expert pour une entreprise de serrurerie en Belgique.
À partir de la transcription brute d'un appel (souvent bruyant), extrais les informations.
Réponds UNIQUEMENT avec un objet JSON valide, clés exactes :
{
  "transcription": "texte nettoyé et fidèle au sens, sans hallucination",
  "probleme": "description courte ou null",
  "adresse": "adresse mentionnée ou null",
  "urgence": false,
  "est_serrurerie": false
}`;

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY manquant — ajoutez la clé dans l'environnement.");
  }
  return new OpenAI({ apiKey: key });
}

function getTranscriptionModel(): string {
  return process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "gpt-4o-transcribe";
}

function getDispatchModel(): string {
  return process.env.OPENAI_DISPATCH_MODEL?.trim() || "gpt-4o-mini";
}

async function audioBufferFromInput(audioInput: Buffer | string): Promise<{ buffer: Buffer; fileName: string }> {
  if (typeof audioInput === "string") {
    const response = await fetch(audioInput);
    if (!response.ok) {
      throw new Error(`Impossible de télécharger l'audio : ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    let fileName = "audio.wav";
    try {
      const u = new URL(audioInput);
      const last = u.pathname.split("/").pop();
      if (last) fileName = last.split("?")[0] || fileName;
    } catch {
      /* garder défaut */
    }
    return { buffer: Buffer.from(arrayBuffer), fileName };
  }
  return { buffer: audioInput, fileName: "audio.wav" };
}

async function transcribeAudioToText(
  client: OpenAI,
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const uploadable = await toFile(buffer, fileName);
  const model = getTranscriptionModel();

  const result = (await client.audio.transcriptions.create({
    file: uploadable,
    model,
    language: "fr",
  })) as string | { text?: string };

  if (typeof result === "string") {
    return result.trim();
  }
  return (result.text ?? "").trim();
}

async function synthesizeFromText(client: OpenAI, rawTranscript: string): Promise<SynthesizedTranscription> {
  const completion = await client.chat.completions.create({
    model: getDispatchModel(),
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: STRUCTURED_SYSTEM },
      {
        role: "user",
        content: `Transcription brute :\n"""${rawTranscript}"""\n\nProduis le JSON demandé.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const jsonString = content.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(jsonString) as SynthesizedTranscription;
}

/**
 * 1) OpenAI Audio Transcriptions (gpt-4o-transcribe, whisper-1, … — voir OPENAI_TRANSCRIPTION_MODEL)
 * 2) Extraction structurée (OPENAI_DISPATCH_MODEL, défaut gpt-4o-mini)
 */
export async function transcrireAppelSerrurier(
  audioInput: Buffer | string,
  fileName: string = "audio.wav"
): Promise<TranscriptionPipelineResult> {
  const client = getClient();
  const { buffer, fileName: resolvedName } =
    typeof audioInput === "string"
      ? await audioBufferFromInput(audioInput)
      : { buffer: audioInput, fileName };

  const baseName = resolvedName || fileName || "audio.wav";
  const rawTranscript = await transcribeAudioToText(client, buffer, baseName);
  if (!rawTranscript) {
    throw new Error("Transcription OpenAI vide.");
  }

  const analysis = await synthesizeFromText(client, rawTranscript);
  if (!analysis.transcription?.trim()) {
    analysis.transcription = rawTranscript;
  }
  return { analysis, rawTranscript };
}
