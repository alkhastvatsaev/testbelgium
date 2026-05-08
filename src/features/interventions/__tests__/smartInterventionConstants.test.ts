import {
  SMART_FORM_ADDRESS_MIN_CHARS_STEP_2,
  smartFormAddressEligibleForStep2,
} from "@/features/interventions/smartInterventionConstants";

describe("smartFormAddressEligibleForStep2", () => {
  it("refuse une adresse vide ou trop courte sans coordonnées", () => {
    expect(smartFormAddressEligibleForStep2("")).toBe(false);
    expect(smartFormAddressEligibleForStep2("   ")).toBe(false);
    expect(smartFormAddressEligibleForStep2("R")).toBe(false);
    expect(smartFormAddressEligibleForStep2("Rue")).toBe(false);
    expect(
      smartFormAddressEligibleForStep2("a".repeat(SMART_FORM_ADDRESS_MIN_CHARS_STEP_2 - 1)),
    ).toBe(false);
  });

  it("accepte une adresse assez longue sans coordonnées", () => {
    expect(
      smartFormAddressEligibleForStep2("a".repeat(SMART_FORM_ADDRESS_MIN_CHARS_STEP_2)),
    ).toBe(true);
  });

  it("accepte des coordonnées sans texte d’adresse (ex. géolocalisation avant géocodage)", () => {
    expect(smartFormAddressEligibleForStep2("", { lat: 50.84, lng: 4.35 })).toBe(true);
  });

  it("accepte une adresse courte si des coordonnées précises sont connues (Places, GPS)", () => {
    expect(smartFormAddressEligibleForStep2("R", { lat: 50.84, lng: 4.35 })).toBe(true);
  });
});
