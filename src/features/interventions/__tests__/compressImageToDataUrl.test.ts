describe("compressImageToDataUrl", () => {
  it("exporte une fonction utilitaire", async () => {
    const { compressImageToDataUrl } = await import("../compressImageToDataUrl");
    expect(typeof compressImageToDataUrl).toBe("function");
  });
});
