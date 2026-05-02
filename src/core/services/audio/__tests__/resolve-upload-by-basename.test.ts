import fs from "fs";
import os from "os";
import path from "path";
import { findUploadedAudioRelativePath } from "../resolve-upload-by-basename";

describe("findUploadedAudioRelativePath", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("trouve un fichier à la racine", () => {
    fs.writeFileSync(path.join(tmp, "call-1.m4a"), "x");
    expect(findUploadedAudioRelativePath(tmp, "call-1.m4a")).toBe("call-1.m4a");
  });

  it("trouve un fichier dans un sous-dossier client", () => {
    const sub = path.join(tmp, "M_DUPONT");
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, "call-2.m4a"), "x");
    expect(findUploadedAudioRelativePath(tmp, "call-2.m4a")).toBe("M_DUPONT/call-2.m4a");
  });

  it("accepte un chemin relatif complet (uploads/M_X/fichier.m4a)", () => {
    const sub = path.join(tmp, "M_DUPONT");
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, "call-3.m4a"), "x");
    expect(findUploadedAudioRelativePath(tmp, "/uploads/M_DUPONT/call-3.m4a")).toBe("M_DUPONT/call-3.m4a");
    expect(findUploadedAudioRelativePath(tmp, "M_DUPONT/call-3.m4a")).toBe("M_DUPONT/call-3.m4a");
  });

  it("rejette les extensions non audio (basename uniquement)", () => {
    fs.writeFileSync(path.join(tmp, "x.m4a"), "x");
    expect(findUploadedAudioRelativePath(tmp, "evil.exe")).toBeNull();
  });
});
