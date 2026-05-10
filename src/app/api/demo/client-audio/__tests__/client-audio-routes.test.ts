/** @jest-environment node */

import { GET as listGet, POST as uploadPost } from "../route";
import { GET as fileGet } from "../file/[name]/route";
import * as fs from "node:fs/promises";

jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
}));

const mockedFs = jest.mocked(fs);

describe("demo client-audio API routes", () => {
  const cwdSpy = jest.spyOn(process, "cwd").mockReturnValue("/proj");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    cwdSpy.mockRestore();
  });

  describe("GET /api/demo/client-audio (list)", () => {
    it("returns file metadata for non-hidden files", async () => {
      mockedFs.readdir.mockResolvedValueOnce(["clip.webm", ".hidden"] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      mockedFs.stat.mockImplementation(async (target) => {
        const p = String(target);
        if (p.endsWith("clip.webm")) {
          return { isFile: () => true, size: 99, mtimeMs: 1000 } as Awaited<ReturnType<typeof fs.stat>>;
        }
        throw new Error("unexpected stat");
      });

      const res = await listGet();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { files: Array<{ name: string; size: number; mtimeMs: number }> };
      expect(body.files).toEqual([{ name: "clip.webm", size: 99, mtimeMs: 1000 }]);
    });

    it("returns an empty list when readdir fails", async () => {
      mockedFs.readdir.mockRejectedValueOnce(new Error("ENOENT"));

      const res = await listGet();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { files: unknown[] };
      expect(body.files).toEqual([]);
    });
  });

  describe("POST /api/demo/client-audio (upload)", () => {
    it("writes audio and returns a file URL", async () => {
      mockedFs.mkdir.mockResolvedValueOnce(undefined);
      mockedFs.writeFile.mockResolvedValueOnce(undefined);

      const file = new File([new Uint8Array([1, 2, 3])], "rec.webm", { type: "audio/webm" });
      const form = new FormData();
      form.set("audio", file);
      const req = new Request("http://localhost/api/demo/client-audio", { method: "POST", body: form });

      const res = await uploadPost(req);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { url: string; mimeType: string };
      expect(body.mimeType).toBe("audio/webm");
      expect(body.url).toMatch(/^\/api\/demo\/client-audio\/file\//);
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });

    it("returns 400 when audio part is missing", async () => {
      const form = new FormData();
      const req = new Request("http://localhost/api/demo/client-audio", { method: "POST", body: form });

      const res = await uploadPost(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/demo/client-audio/file/[name]", () => {
    it("streams webm with the correct content type", async () => {
      mockedFs.readFile.mockResolvedValueOnce(Buffer.from([0, 1]));

      const res = await fileGet(new Request("http://localhost/x"), {
        params: Promise.resolve({ name: "a.webm" }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("audio/webm");
    });

    it("uses audio/mp4 for m4a", async () => {
      mockedFs.readFile.mockResolvedValueOnce(Buffer.from([0]));

      const res = await fileGet(new Request("http://localhost/x"), {
        params: Promise.resolve({ name: "a.m4a" }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("audio/mp4");
    });

    it("returns 404 when the file cannot be read", async () => {
      const errLog = jest.spyOn(console, "error").mockImplementation(() => {});
      mockedFs.readFile.mockRejectedValueOnce(new Error("ENOENT"));

      const res = await fileGet(new Request("http://localhost/x"), {
        params: Promise.resolve({ name: "missing.webm" }),
      });
      expect(res.status).toBe(404);
      errLog.mockRestore();
    });

    it("resolves paths with path.basename only", async () => {
      mockedFs.readFile.mockResolvedValueOnce(Buffer.from([9]));

      await fileGet(new Request("http://localhost/x"), {
        params: Promise.resolve({ name: "../../etc/passwd" }),
      });

      expect(mockedFs.readFile).toHaveBeenCalledWith(
        expect.stringMatching(/passwd$/),
      );
    });
  });
});
