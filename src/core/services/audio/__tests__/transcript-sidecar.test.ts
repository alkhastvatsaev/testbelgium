import fs from "fs";
import os from "os";
import path from "path";
import type { AudioUploadSidecar } from "../transcription.types";
import {
  audioJsonSidecarPathForPublicUpload,
  readAudioUploadSidecarIfPresent,
  readTranscriptSidecarIfPresent,
  transcriptSidecarPathForPublicUpload,
  writeAudioUploadSidecar,
  writeTranscriptSidecarFile,
} from "../transcript-sidecar";

const sampleAnalysis: AudioUploadSidecar["analysis"] = {
  transcription: "Bonjour",
  probleme: "porte",
  adresse: null,
  urgence: true,
  est_serrurerie: true,
};

describe("transcript-sidecar / audio.json", () => {
  let tmp: string;
  let prevCwd: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sidecar-"));
    prevCwd = process.cwd();
    process.chdir(tmp);
    fs.mkdirSync(path.join(tmp, "public", "uploads"), { recursive: true });
  });

  afterEach(() => {
    process.chdir(prevCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("writeAudioUploadSidecar writes foo.audio.json next to logical upload", () => {
    const payload: AudioUploadSidecar = {
      schemaVersion: 1,
      audioFileName: "foo.m4a",
      publicUrl: "/uploads/foo.m4a",
      phone: "+32...",
      receivedAt: "2026-01-01T10:00:00.000Z",
      processedAt: "2026-01-01T10:00:05.000Z",
      source: "audio-dispatch",
      openai: { transcriptionModel: "gpt-4o-transcribe", dispatchModel: "gpt-4o-mini" },
      analysis: sampleAnalysis,
    };
    writeAudioUploadSidecar("/uploads/foo.m4a", payload);
    const jsonPath = path.join(tmp, "public", "uploads", "foo.audio.json");
    expect(fs.existsSync(jsonPath)).toBe(true);
    const roundtrip = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as AudioUploadSidecar;
    expect(roundtrip.analysis.probleme).toBe("porte");
    expect(roundtrip.openai?.transcriptionModel).toBe("gpt-4o-transcribe");
  });

  it("readTranscriptSidecarIfPresent prefers JSON analysis.transcription", () => {
    writeAudioUploadSidecar("/uploads/a.m4a", {
      schemaVersion: 1,
      audioFileName: "a.m4a",
      publicUrl: "/uploads/a.m4a",
      phone: null,
      receivedAt: "2026-01-01T10:00:00.000Z",
      processedAt: "2026-01-01T10:00:01.000Z",
      source: "api-transcribe",
      analysis: { ...sampleAnalysis, transcription: "depuis json" },
    });
    expect(readTranscriptSidecarIfPresent("a.m4a")).toBe("depuis json");
  });

  it("readTranscriptSidecarIfPresent falls back to legacy .transcript.txt", () => {
    writeTranscriptSidecarFile("/uploads/legacy.m4a", "texte seul");
    expect(readTranscriptSidecarIfPresent("legacy.m4a")).toBe("texte seul");
  });

  it("readAudioUploadSidecarIfPresent returns null when missing", () => {
    expect(readAudioUploadSidecarIfPresent("nope.m4a")).toBeNull();
  });

  it("résout un basename vers un fichier rangé en sous-dossier uploads", () => {
    fs.mkdirSync(path.join(tmp, "public", "uploads", "M_CLIENT"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "public", "uploads", "M_CLIENT", "rec.m4a"), "");
    writeAudioUploadSidecar("/uploads/M_CLIENT/rec.m4a", {
      schemaVersion: 1,
      audioFileName: "M_CLIENT/rec.m4a",
      publicUrl: "/uploads/M_CLIENT/rec.m4a",
      phone: null,
      receivedAt: "2026-01-01T10:00:00.000Z",
      processedAt: "2026-01-01T10:00:01.000Z",
      source: "api-transcribe",
      analysis: { ...sampleAnalysis, transcription: "depuis sous-dossier" },
    });
    expect(readAudioUploadSidecarIfPresent("rec.m4a")?.analysis?.transcription).toBe("depuis sous-dossier");
    expect(readTranscriptSidecarIfPresent("rec.m4a")).toBe("depuis sous-dossier");
  });

  it("transcriptSidecarPathForPublicUpload and audioJson basename", () => {
    expect(path.basename(transcriptSidecarPathForPublicUpload("bar.m4a"))).toBe("bar.transcript.txt");
    expect(path.basename(audioJsonSidecarPathForPublicUpload("bar.m4a"))).toBe("bar.audio.json");
  });
});
