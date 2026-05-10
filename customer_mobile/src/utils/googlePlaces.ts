const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

export function hasGooglePlacesKey(): boolean {
  return GOOGLE_PLACES_API_KEY.length > 0;
}

export interface GooglePlaceSuggestion {
  placeId: string;
  label: string;
}

/** Google Places Autocomplete — returns up to `limit` suggestions */
export async function searchGooglePlacesAutocomplete(
  keyword: string,
  bias?: { latitude: number; longitude: number },
  limit = 4,
): Promise<GooglePlaceSuggestion[]> {
  const params = new URLSearchParams({
    input: keyword,
    key: GOOGLE_PLACES_API_KEY,
    language: "vi",
    components: "country:vn",
  });

  if (bias) {
    params.set("location", `${bias.latitude},${bias.longitude}`);
    params.set("radius", "50000");
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) return [];

  const data = (await response.json()) as {
    predictions?: Array<{ place_id: string; description: string }>;
  };

  return (data.predictions ?? []).slice(0, limit).map((p) => ({
    placeId: p.place_id,
    label: p.description,
  }));
}

/** Google Place Details — resolve lat/lng + formatted address from placeId */
export async function resolveGooglePlaceDetails(placeId: string): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
} | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_PLACES_API_KEY,
    language: "vi",
    fields: "geometry,formatted_address",
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) return null;

  const data = (await response.json()) as {
    result?: {
      geometry?: { location?: { lat: number; lng: number } };
      formatted_address?: string;
    };
  };

  const loc = data.result?.geometry?.location;
  if (!loc) return null;

  return {
    latitude: loc.lat,
    longitude: loc.lng,
    formattedAddress: data.result?.formatted_address ?? "",
  };
}

/** Google Geocoding API — reverse geocode coordinates to Vietnamese address */
export async function reverseGeocodeWithGoogle(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const params = new URLSearchParams({
    latlng: `${latitude},${longitude}`,
    key: GOOGLE_PLACES_API_KEY,
    language: "vi",
    result_type: "street_address|route|premise|subpremise",
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) return null;

  const data = (await response.json()) as {
    results?: Array<{ formatted_address: string }>;
    status?: string;
  };

  if (data.status !== "OK" || !data.results?.length) return null;
  return data.results[0].formatted_address;
}
