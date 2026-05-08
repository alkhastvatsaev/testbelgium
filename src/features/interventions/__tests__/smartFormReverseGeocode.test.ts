/** @jest-environment jsdom */
import { resolveInterventionAddressFromCoords } from "../smartFormReverseGeocode";

const KEY = "NEXT_PUBLIC_MAPBOX_TOKEN";

describe("resolveInterventionAddressFromCoords", () => {
  const originalToken = process.env[KEY];

  afterEach(() => {
    process.env[KEY] = originalToken;
  });

  it("utilise l’adresse renvoyée par /api/maps/geocode", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        address: "Rue Serveur 1, 1050 Bruxelles",
        location: { lat: 50.84, lng: 4.35 },
      }),
    });

    const r = await resolveInterventionAddressFromCoords(50.83, 4.34);
    expect(r.formatted).toBe("Rue Serveur 1, 1050 Bruxelles");
    expect(r.location).toEqual({ lat: 50.84, lng: 4.35 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/maps\/geocode\?lat=50\.83&lng=4\.34/));
  });

  it("sans adresse serveur, appelle Mapbox public si NEXT_PUBLIC_MAPBOX_TOKEN est défini", async () => {
    process.env[KEY] = "tk-test";
    (global.fetch as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: null,
          location: { lat: 50.84, lng: 4.35 },
          approximate: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{ place_name: "Rue Fallback 2, 1000 Bruxelles" }],
        }),
      });

    const r = await resolveInterventionAddressFromCoords(50.84, 4.35);
    expect(r.formatted).toBe("Rue Fallback 2, 1000 Bruxelles");
    expect(r.location).toEqual({ lat: 50.84, lng: 4.35 });
    expect(fetch).toHaveBeenCalledTimes(3);
    const thirdUrl = (fetch as jest.Mock).mock.calls[2]?.[0] as string;
    expect(thirdUrl).toContain("api.mapbox.com/geocoding/v5/mapbox.places/");
    expect(thirdUrl).not.toContain("country=be");
  });
});
