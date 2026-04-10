import * as Location from "expo-location";

export function formatAddressFromGeocode(geo?: Location.LocationGeocodedAddress | null): string | undefined {
  if (!geo) {
    return undefined;
  }

  const extendedGeo = geo as Location.LocationGeocodedAddress & { formattedAddress?: string };
  if (extendedGeo.formattedAddress?.trim()) {
    return extendedGeo.formattedAddress.trim();
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
  return deduped.length ? deduped.join(", ") : undefined;
}

export function formatCoordinateAddress(latitude: number, longitude: number): string {
  return `Vi tri hien tai (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
}

export async function reverseGeocodeToDisplayAddress(
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
  return formatAddressFromGeocode(geocode[0]);
}
