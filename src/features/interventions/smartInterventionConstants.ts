import { COMPANY_HUB_PAGE_INDEX } from "@/features/company/companyHubConstants";

/** Formulaire smart — panneau gauche du hub société (`CompanyHubPage`). */
export const SMART_INTERVENTION_FORM_SLOT_INDEX = COMPANY_HUB_PAGE_INDEX;

export const SMART_INTERVENTION_DRAFT_STORAGE_KEY = "bm_smart_intervention_draft_v1";

/** Valeur interne du champ adresse pendant la géolocalisation (ne pas traduire ; affichage via i18n). */
export const REQUESTER_GEOLOC_ADDRESS_PENDING = "__BM_REQUESTER_GEOLOC_PENDING__" as const;

/**
 * Sans suggestion Google / point sur carte, on n’enchaîne pas l’étape adresse → type
 * sur une saisie trop courte (évite le passage à l’étape 2 au premier caractère).
 */
export const SMART_FORM_ADDRESS_MIN_CHARS_STEP_2 = 12;

export function smartFormAddressEligibleForStep2(
  address: string,
  placeLatLng?: { lat: number; lng: number },
): boolean {
  if (
    placeLatLng &&
    Number.isFinite(placeLatLng.lat) &&
    Number.isFinite(placeLatLng.lng)
  ) {
    return true;
  }
  const t = address.trim();
  if (!t) return false;
  return t.length >= SMART_FORM_ADDRESS_MIN_CHARS_STEP_2;
}

/** Gabarit type de problème — tuile étape 2. */
export type SmartFormTemplate = {
  id: string;
  /** Libellé unique pour données & récap (une ligne). */
  label: string;
  seed: string;
  /** Affichage tuile sur deux lignes ; si absent, `label` avec césure auto. */
  labelLines?: readonly [string, string];
};

/** Gabarits ultra-courts — remplissage en un tap (philosophie « less is more »). */
export const SMART_FORM_TEMPLATES: readonly SmartFormTemplate[] = [
  {
    id: "blocked",
    label: "smart_form.templates.blocked.label",
    seed: "smart_form.templates.blocked.seed",
  },
  {
    id: "armored",
    label: "smart_form.templates.armored.label",
    labelLines: ["smart_form.templates.armored.line1", "smart_form.templates.armored.line2"],
    seed: "smart_form.templates.armored.seed",
  },
  {
    id: "broken-key",
    label: "smart_form.templates.broken_key.label",
    labelLines: ["smart_form.templates.broken_key.line1", "smart_form.templates.broken_key.line2"],
    seed: "smart_form.templates.broken_key.seed",
  },
  {
    id: "cylinder",
    label: "smart_form.templates.cylinder.label",
    seed: "smart_form.templates.cylinder.seed",
  },
  {
    id: "locked-out",
    label: "smart_form.templates.locked_out.label",
    labelLines: ["smart_form.templates.locked_out.line1", "smart_form.templates.locked_out.line2"],
    seed: "smart_form.templates.locked_out.seed",
  },
  {
    id: "safe",
    label: "smart_form.templates.safe.label",
    labelLines: ["smart_form.templates.safe.line1", "smart_form.templates.safe.line2"],
    seed: "smart_form.templates.safe.seed",
  },
  {
    id: "roller-shutter",
    label: "smart_form.templates.roller_shutter.label",
    seed: "smart_form.templates.roller_shutter.seed",
  },
  {
    id: "digicode",
    label: "smart_form.templates.digicode.label",
    seed: "smart_form.templates.digicode.seed",
  },
  {
    id: "key-copy",
    label: "smart_form.templates.key_copy.label",
    labelLines: ["smart_form.templates.key_copy.line1", "smart_form.templates.key_copy.line2"],
    seed: "smart_form.templates.key_copy.seed",
  },
];
