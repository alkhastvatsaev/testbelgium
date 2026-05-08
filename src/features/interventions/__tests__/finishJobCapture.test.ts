import { dataUrlToBlob } from "@/features/interventions/finishJobCapture";

describe("finishJobCapture", () => {
  it("dataUrlToBlob reproduit le type MIME", () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEgwJ/lSIGJgAAAABJRU5ErkJggg==";
    const blob = dataUrlToBlob(png);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("rejette une chaîne invalide", () => {
    expect(() => dataUrlToBlob("pas-un-data-url")).toThrow();
  });
});
