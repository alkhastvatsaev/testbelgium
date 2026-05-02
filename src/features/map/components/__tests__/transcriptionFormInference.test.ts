import {
  extractClientNameFromText,
  extractDateTimeFromText,
  extractSpokenFrenchHour,
} from "../transcriptionFormInference";

describe("transcriptionFormInference", () => {
  it("extrait le nom depuis « X à l'appareil »", () => {
    expect(extractClientNameFromText("Buisson à l'appareil")).toBe("M. Buisson");
    expect(extractClientNameFromText("C'est Jean-Pierre à l'appareil, bonjour")).toBe("M. Jean-Pierre");
  });

  it("conserve l'inférence Monsieur / Madame", () => {
    expect(extractClientNameFromText("Bonjour je suis Monsieur Dupont")).toBe("M. Dupont");
  });

  it("convertit les heures en toutes lettres (ex. quinze heures) en 15:00", () => {
    expect(extractSpokenFrenchHour("demain à quinze heures")).toBe(15);
    const r = extractDateTimeFromText(
      "est-ce que vous pouvez passer demain à quinze heures",
      "2026-05-01T12:00:00.000Z",
    );
    expect(r.time).toBe("15:00");
  });

  it("la mention « demain » décale le jour par rapport au même référentiel que sans mot-clé", () => {
    const base = "2026-05-01T12:00:00.000Z";
    const sameDay = extractDateTimeFromText("aujourd'hui passage à quinze heures", base);
    const next = extractDateTimeFromText("demain à quinze heures", base);
    expect(next.time).toBe("15:00");
    expect(sameDay.time).toBe("15:00");
    expect(sameDay.date).not.toEqual(next.date);
  });

  it("préfère une heure numérique si elle est présente dans le texte", () => {
    const r = extractDateTimeFromText("demain à 14h30 et aussi quinze heures", "2026-06-01T10:00:00.000Z");
    expect(r.time).toBe("14:30");
  });
});
