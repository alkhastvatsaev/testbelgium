/** @jest-environment node */
import {
  mapboxReverseGeocodeAttemptUrls,
  pickPlaceLabelFromFeatures,
} from "@/core/maps/mapboxReverseGeocode";

describe("pickPlaceLabelFromFeatures", () => {
  it("préfère place_name avec un seul feature", () => {
    expect(
      pickPlaceLabelFromFeatures([{ text: "Court", place_name: "Court 1, Bruxelles, Belgique" }]),
    ).toBe("Court 1, Bruxelles, Belgique");
  });

  it("retombe sur text", () => {
    expect(pickPlaceLabelFromFeatures([{ text: "Square Jaroslav Hašek" }])).toBe("Square Jaroslav Hašek");
  });

  it("privilégie une ligne address même si une poi arrive en premier", () => {
    expect(
      pickPlaceLabelFromFeatures([
        {
          place_type: ["poi"],
          place_name: "Restaurant du coin, Strasbourg",
        },
        {
          place_type: ["address"],
          place_name: "17 Rue Sénèque, 67200 Strasbourg, France",
        },
      ]),
    ).toBe("17 Rue Sénèque, 67200 Strasbourg, France");
  });
});

describe("mapboxReverseGeocodeAttemptUrls", () => {
  it("en Belgique : Belgique puis monde", () => {
    const urls = mapboxReverseGeocodeAttemptUrls(4.35, 50.84, "abc", 5);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("country=be");
    expect(urls[1]).not.toContain("country=");
    expect(urls[0]!.startsWith("https://api.mapbox.com/geocoding/v5/mapbox.places/4.35,50.84.json")).toBe(
      true,
    );
  });

  it("Strasbourg : une seule requête sans country=be", () => {
    const urls = mapboxReverseGeocodeAttemptUrls(7.75, 48.58, "abc", 10);
    expect(urls).toHaveLength(1);
    expect(urls[0]).not.toContain("country=");
    expect(urls[0]).toContain("limit=10");
    expect(urls[0]).toContain("/7.75,48.58.json?");
  });
});
