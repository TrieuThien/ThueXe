import * as Location from "expo-location";
import { formatVietnameseAddress } from "./vietnameseAddressParser";

export function formatAddressFromGeocode(geo?: Location.LocationGeocodedAddress | null): string | undefined {
  if (!geo) {
    return undefined;
  }

  const extendedGeo = geo as Location.LocationGeocodedAddress & { formattedAddress?: string };
  if (extendedGeo.formattedAddress?.trim()) {
    // Phase 3: Apply Vietnamese formatting to reverse geocode results
    return formatVietnameseAddress(extendedGeo.formattedAddress.trim());
  }

  const rawParts = [
    geo.name,
    geo.streetNumber,
    geo.street,
    geo.subregion,
    geo.district,
    geo.city,
    geo.region,
    geo.postalCode,
    geo.country,
  ];

  const normalized = rawParts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0);

  const deduped = normalized.filter((part, index) => normalized.indexOf(part) === index);
  const result = deduped.length ? deduped.join(", ") : undefined;

  // Phase 3: Apply Vietnamese formatting
  return result ? formatVietnameseAddress(result) : result;
}

export function formatCoordinateAddress(latitude: number, longitude: number): string {
  return `Vị trí hiện tại (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
}
  
export async function reverseGeocodeToDisplayAddress(
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  // Phase 5: Try Nominatim reverse API first for consistency
  try {
    const nominatimParams = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      zoom: "18",
      "accept-language": "vi",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${nominatimParams.toString()}`,
      {
        headers: { Accept: "application/json" },
      },
    );

    if (response.ok) {
      const data = (await response.json()) as {
        address?: Record<string, unknown>;
        display_name?: string;
      };

      // Use same formatter as forward geocoding for consistency
      if (data.address) {
        const fromStructured = buildLabelFromStructuredAddress(data.address);
        if (fromStructured) return fromStructured;
      }

      if (data.display_name) {
        return formatVietnameseAddress(data.display_name);
      }
    }
  } catch {
    // Fall through to Expo reverse geocoding
  }

  // Fallback to Expo reverse geocoding
  const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
  return formatAddressFromGeocode(geocode[0]);
}

/**
 * Phase 5: Build structured address label (exported for use by reverse geocoding)
 * Same logic as in useAddressAutocomplete for consistency
 */
export function buildLabelFromStructuredAddress(source: Record<string, unknown>): string {
  function pickFirst(src: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const raw = src[key];
      if (typeof raw === "string") {
        const normalized = (raw as string).replace(/\s+/g, " ").trim();
        if (normalized) return normalized;
      }
    }
    return "";
  }

  const houseNumber = pickFirst(source, ["housenumber", "house_number", "streetNumber"]);
  const road = pickFirst(source, ["road", "street", "residential", "pedestrian"]);
  const numberAndRoad = [houseNumber, road].filter(Boolean).join(" ").trim();

  const line1 = pickFirst(source, ["name", "house", "building"]) || numberAndRoad;
  const line2 = pickFirst(source, ["street", "road", "suburb", "quarter", "neighbourhood", "ward", "village", "hamlet"]);
  const line3 = pickFirst(source, ["district", "city_district", "cityDistrict", "borough", "county"]);
  const line4 = pickFirst(source, ["city", "town", "municipality", "state", "region"]);

  const parts = [line1, line2, line3, line4].filter(Boolean);
  const deduped = parts.filter((part, index) => parts.findIndex((x) => x.toLowerCase() === part.toLowerCase()) === index);

  return deduped.join(", ");
}
