import { capitalizeName, formatAddress } from "../stringUtils";

describe("stringUtils", () => {
  describe("capitalizeName", () => {
    it("returns empty string for empty input", () => {
      expect(capitalizeName("")).toBe("");
    });

    it("capitalizes words and preserves hyphen boundaries", () => {
      expect(capitalizeName("  jean-pierre DUPONT  ")).toBe("Jean-Pierre Dupont");
    });
  });

  describe("formatAddress", () => {
    it("returns empty string for empty input", () => {
      expect(formatAddress("")).toBe("");
    });

    it("title-cases the first word and leaves stop words lowercased", () => {
      expect(formatAddress("rue de la paix 5")).toMatch(/^Rue de la Paix 5/);
    });

    it("appends default Brussels suffix when country and postal hints are missing", () => {
      expect(formatAddress("Avenue Louise")).toBe("Avenue Louise, 1000 Bruxelles, Belgique");
    });

    it("appends only Belgique when a postal code is already present", () => {
      expect(formatAddress("Chaussée de Waterloo 400, 1060")).toBe(
        "Chaussée de Waterloo 400, 1060, Belgique",
      );
    });

    it("does not duplicate country when Belgique is present", () => {
      expect(formatAddress("Bd Général Jacques 20, Belgique")).toBe(
        "Bd Général Jacques 20, Belgique",
      );
    });

    it("appends Belgique when Brussels appears without Belgium", () => {
      expect(formatAddress("Square de Meeûs 1, Brussels")).toBe(
        "Square de Meeûs 1, Brussels, Belgique",
      );
    });
  });
});
