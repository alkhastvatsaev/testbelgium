import { pickLargestUploadBlobFromFormData } from "../pick-upload-blob-from-form-data";

describe("pickLargestUploadBlobFromFormData", () => {
  it("choisit le Blob le plus grand lorsque plusieurs fichiers sont envoyés", () => {
    const fd = new FormData();
    fd.append("small", new Blob([new Uint8Array(13 * 1024)]));
    fd.append("recording", new Blob([new Uint8Array(500 * 1024)]));
    const picked = pickLargestUploadBlobFromFormData(fd);
    expect(picked).not.toBeNull();
    expect(picked!.size).toBe(500 * 1024);
  });

  it("ignore les champs texte et retourne le seul fichier", () => {
    const fd = new FormData();
    fd.append("note", "hello");
    fd.append("file", new Blob([new Uint8Array(2000)]));
    const picked = pickLargestUploadBlobFromFormData(fd);
    expect(picked?.size).toBe(2000);
  });

  it("retourne null si aucun Blob", () => {
    const fd = new FormData();
    fd.append("a", "only text");
    expect(pickLargestUploadBlobFromFormData(fd)).toBeNull();
  });
});
