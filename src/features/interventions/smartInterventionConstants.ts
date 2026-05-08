import { COMPANY_HUB_PAGE_INDEX } from "@/features/company/companyHubConstants";

/** Formulaire smart — panneau gauche du hub société (`CompanyHubPage`). */
export const SMART_INTERVENTION_FORM_SLOT_INDEX = COMPANY_HUB_PAGE_INDEX;

export const SMART_INTERVENTION_DRAFT_STORAGE_KEY = "bm_smart_intervention_draft_v1";

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
  { id: "blocked", label: "Serrure bloquée", seed: "Serrure bloquée, la clé ne tourne plus." },
  {
    id: "armored",
    label: "Porte blindée",
    labelLines: ["Porte", "blindée"],
    seed: "Porte blindée qui ne ferme plus correctement.",
  },
  {
    id: "broken-key",
    label: "Clé cassée",
    labelLines: ["Clé", "cassée"],
    seed: "Clé cassée dans la serrure, extraction nécessaire.",
  },
  { id: "cylinder", label: "Cylindre", seed: "Remplacement de cylindre / barillet." },
  {
    id: "locked-out",
    label: "Porte claquée",
    labelLines: ["Porte", "claquée"],
    seed: "Porte claquée, accès urgent nécessaire.",
  },
  {
    id: "safe",
    label: "Coffre fort",
    labelLines: ["Coffre", "fort"],
    seed: "Problème d’ouverture coffre fort / armoire forte.",
  },
  {
    id: "roller-shutter",
    label: "Rideau métallique",
    seed: "Rideau métallique bloqué ou en panne, ouverture ou réparation nécessaire.",
  },
  { id: "digicode", label: "Digicode / badge", seed: "Digicode, lecteur de badge ou interphone en panne, accès impossible." },
  {
    id: "key-copy",
    label: "Copie de clé",
    labelLines: ["Copie de", "clé"],
    seed: "Besoin de copies de clés (plate ou sécurisée), sur rendez-vous ou urgence.",
  },
];
