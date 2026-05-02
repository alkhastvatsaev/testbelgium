import fs from "fs";
import os from "os";
import path from "path";
import {
  findPendingUploadJobs,
  pickCanonicalAudioFile,
  stemNeedsProcessing,
} from "../process-upload-jobs";

describe("process-upload-jobs", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "upload-jobs-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("pickCanonicalAudioFile prefers m4a over wav", () => {
    expect(pickCanonicalAudioFile(["a.wav", "a.m4a"])).toBe("a.m4a");
  });

  it("stemNeedsProcessing true when json missing", () => {
    fs.writeFileSync(path.join(tmp, "x.m4a"), "fake");
    expect(stemNeedsProcessing(tmp, ["x.m4a"])).toBe(true);
  });

  it("stemNeedsProcessing false when json is newer than audio", () => {
    const audio = path.join(tmp, "x.m4a");
    const json = path.join(tmp, "x.audio.json");
    fs.writeFileSync(audio, "fake");
    fs.writeFileSync(json, "{}");
    const now = Date.now();
    fs.utimesSync(audio, (now - 30_000) / 1000, (now - 30_000) / 1000);
    fs.utimesSync(json, (now + 5_000) / 1000, (now + 5_000) / 1000);
    expect(stemNeedsProcessing(tmp, ["x.m4a"])).toBe(false);
  });

  it("stemNeedsProcessing true when audio is newer than json", () => {
    const audio = path.join(tmp, "x.m4a");
    const json = path.join(tmp, "x.audio.json");
    fs.writeFileSync(audio, "fake");
    fs.writeFileSync(json, "{}");
    const now = Date.now();
    fs.utimesSync(json, (now - 30_000) / 1000, (now - 30_000) / 1000);
    fs.utimesSync(audio, (now + 5_000) / 1000, (now + 5_000) / 1000);
    expect(stemNeedsProcessing(tmp, ["x.m4a"])).toBe(true);
  });

  it("findPendingUploadJobs sorts oldest first", () => {
    fs.writeFileSync(path.join(tmp, "old.m4a"), "a");
    fs.writeFileSync(path.join(tmp, "new.m4a"), "b");
    const oldT = Date.now() - 60_000;
    const newT = Date.now();
    fs.utimesSync(path.join(tmp, "old.m4a"), oldT / 1000, oldT / 1000);
    fs.utimesSync(path.join(tmp, "new.m4a"), newT / 1000, newT / 1000);
    const jobs = findPendingUploadJobs(tmp);
    expect(jobs.map((j) => j.canonical)).toEqual(["old.m4a", "new.m4a"]);
  });
});
