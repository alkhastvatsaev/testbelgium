/** Géocodage inverse pour le formulaire : API Next d’abord, puis Mapbox public (NEXT_PUBLIC_MAPBOX_TOKEN) pour la PWA hors token serveur */

import {
  mapboxReverseGeocodeAttemptUrls,
  pickPlaceLabelFromFeatures,
  type MapboxGeocodeFeature,
} from "@/core/maps/mapboxReverseGeocode";

const REVERSE_RESULTS = 10;

async function reverseGeocodeMapboxPublic(lat: number, lng: number): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  if (!token) return null;

  const urls = mapboxReverseGeocodeAttemptUrls(lng, lat, token, REVERSE_RESULTS);

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json().catch(() => null)) as {
        features?: MapboxGeocodeFeature[];
      } | null;
      const label = pickPlaceLabelFromFeatures(data?.features);
      if (label) return label;
    } catch {
      /* essai suivant */
    }
  }
  return null;
}

/** Résout une ligne d’adresse lisible pour la barre du smart form ; retourne aussi les coords affinées si l’API les fournit */
export async function resolveInterventionAddressFromCoords(
  lat: number,
  lng: number,
): Promise<{ formatted: string | null; location: { lat: number; lng: number } }> {
  let location: { lat: number; lng: number } = { lat, lng };

  try {
    const res = await fetch(
      `/api/maps/geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    );
    if (res.ok) {
      const data = ((await res.json().catch(() => null)) ?? null) as {
        address?: string | null;
        location?: { lat: number; lng: number };
      } | null;
      if (data) {
        if (
          data.location &&
          typeof data.location.lat === "number" &&
          typeof data.location.lng === "number"
        ) {
          location = data.location;
        }
        const trimmed = data.address?.trim();
        if (trimmed) return { formatted: trimmed, location };
      }
    }
  } catch {
    /* secours navigateur ci-dessous */
  }

  const fromPublic = await reverseGeocodeMapboxPublic(lat, lng);
  return { formatted: fromPublic, location };
}
