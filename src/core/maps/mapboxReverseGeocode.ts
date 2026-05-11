export type MapboxGeocodeFeature = {
  place_name?: string;
  text?: string;
  place_type?: string[];
  relevance?: number;
};

/** Poids des types Mapbox inverse : une ligne « numéro + rue + ville + CP » est presque toujours `address`. */
const PLACE_TYPE_PRIORITY: Record<string, number> = {
  address: 100,
  street: 88,
  block: 86,
  neighborhood: 50,
  locality: 45,
  postcode: 40,
  place: 38,
  district: 34,
  region: 28,
  country: 8,
  poi: 35,
};

function priorityOfFeature(f: MapboxGeocodeFeature): number {
  const types = f.place_type ?? [];
  if (!types.length) return 12;
  return Math.max(
    ...types.map((t) => (PLACE_TYPE_PRIORITY[t] !== undefined ? PLACE_TYPE_PRIORITY[t]! : 18)),
  );
}

/** Boîte approximative (Belgique uniquement). Hors de ça → pas de filtre country=be (France, etc.). */
export function coordsLookLikeBelgium(lat: number, lng: number): boolean {
  return lat >= 49.4 && lat <= 51.55 && lng >= 2.45 && lng <= 6.45;
}

function labelFromFeature(f: MapboxGeocodeFeature): string | null {
  const full = f.place_name?.trim();
  if (full) return full;
  const short = f.text?.trim();
  if (short) return short;
  return null;
}

/**
 * Parcourt les résultats Mapbox inverse : privilégie une **adresse postale**
 * (« 17 rue …, Strasbourg, 67200 ») plutôt qu’un premier résultat souvent POI / place sans numéro.
 */
export function pickPlaceLabelFromFeatures(
  features: MapboxGeocodeFeature[] | undefined,
): string | null {
  if (!features?.length) return null;

  const rows: { label: string; prio: number; rel: number; len: number }[] = [];
  for (const f of features) {
    const label = labelFromFeature(f);
    if (!label) continue;
    rows.push({
      label,
      prio: priorityOfFeature(f),
      rel: typeof f.relevance === "number" ? f.relevance : 0,
      len: label.length,
    });
  }
  if (!rows.length) return null;

  rows.sort((a, b) => {
    const d = b.prio - a.prio;
    if (d !== 0) return d;
    if (b.rel !== a.rel) return b.rel - a.rel;
    return b.len - a.len;
  });

  return rows[0]!.label;
}

/**
 * Tentatives URLs : Belgium + monde seulement si la position semble être en Belgique ;
 * sinon une seule requête monde (France, etc.) pour ne pas forcer une adresse hors pays.
 */
export function mapboxReverseGeocodeAttemptUrls(
  lng: number,
  lat: number,
  token: string,
  limit: number,
): string[] {
  const enc = encodeURIComponent(token);
  const base = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${enc}&language=fr&limit=${limit}`;
  const world = base;
  if (coordsLookLikeBelgium(lat, lng)) {
    return [`${base}&country=be`, world];
  }
  return [world];
}
