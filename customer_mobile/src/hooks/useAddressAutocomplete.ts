import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

import { formatAddressFromGeocode } from "../utils/address";
import { calculateRankingScore, applyDistancePenalty, calculateDistance, calculateMatchQuality } from "../utils/addressRanking";
import { formatVietnameseAddress } from "../utils/vietnameseAddressParser";
import { AddressCache, RequestDeduplicator } from "../utils/addressCache";
import { hasGooglePlacesKey, searchGooglePlacesAutocomplete } from "../utils/googlePlaces";

/**
 * Phase 4: Calculate dynamic zoom level based on location accuracy
 * - Better accuracy (<50m) → zoom 18 (street level)
 * - Medium accuracy (50-500m) → zoom 14 (neighborhood)
 * - Poor accuracy (>500m) → zoom 12 (district)
 */
function getZoomFromAccuracy(accuracy?: number): number {
  if (!accuracy) return 14; // default
  if (accuracy < 50) return 18;
  if (accuracy < 500) return 14;
  return 12;
}

/**
 * Phase 4: Calculate viewbox for Nominatim (bounding box around user location)
 * Helps Nominatim prioritize results within ~5km radius
 */
function getViewboxParams(latitude: number, longitude: number): Record<string, string> {
  const radiusKm = 5;
  const latDelta = radiusKm / 111; // 1 degree ≈ 111 km
  const lonDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180)); // Adjust for latitude

  return {
    viewbox: `${longitude - lonDelta},${latitude - latDelta},${longitude + lonDelta},${latitude + latDelta}`,
    bounded: "1", // Prioritize results within viewbox
  };
}

/**
 * Phase 6: Create fetch with timeout support
 * Prevents hanging requests and UI freezes
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Phase 6: Exponential backoff retry helper
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt); // 100ms → 200ms → 400ms
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

interface GeoBias {
  latitude: number;
  longitude: number;
  accuracy?: number;
  currentLocation?: {
    label: string;
    latitude: number;
    longitude: number;
  };
}

export interface AddressSuggestion {
  id: string;
  label: string;
  latitude?: number;
  longitude?: number;
  score?: number;
  isCurrentLocation?: boolean;
  placeId?: string;
}

// Phase 2: Singleton cache and request deduplicator
const addressCache = new AddressCache(50, 5); // 50 entries, 5 min TTL
const requestDeduplicator = new RequestDeduplicator<AddressSuggestion[]>();

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pickFirst(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const raw = source[key];
    if (typeof raw === "string" && normalize(raw)) {
      return normalize(raw);
    }
  }
  return "";
}

function dedupe(parts: string[]): string[] {
  const cleaned = parts.map(normalize).filter(Boolean);
  return cleaned.filter((part, index) => cleaned.findIndex((x) => x.toLowerCase() === part.toLowerCase()) === index);
}

// Keep same visual style as current pickup autofill: name, street, district, city
function buildLabelFromStructuredAddress(source: Record<string, unknown>): string {
  const houseNumber = pickFirst(source, ["housenumber", "house_number", "streetNumber"]);
  const road = pickFirst(source, ["road", "street", "residential", "pedestrian"]);
  const numberAndRoad = [houseNumber, road].filter(Boolean).join(" ").trim();

  const line1 = pickFirst(source, ["name", "house", "building"]) || numberAndRoad;
  const line2 = pickFirst(source, ["street", "road", "suburb", "quarter", "neighbourhood", "ward", "village", "hamlet"]);
  const line3 = pickFirst(source, ["district", "city_district", "cityDistrict", "borough", "county"]);
  const line4 = pickFirst(source, ["city", "town", "municipality", "state", "region"]);

  return dedupe([line1, line2, line3, line4]).join(", ");
}

function buildLabelFromDisplayName(displayName?: string): string {
  if (!displayName) {
    return "";
  }

  // Phase 3: Try Vietnamese parsing first for better formatting
  const vietnamFormatted = formatVietnameseAddress(displayName);
  if (vietnamFormatted.length > 0) {
    return vietnamFormatted;
  }

  // Fallback to original logic
  const segments = displayName
    .split(",")
    .map((part) => normalize(part))
    .filter(Boolean);

  if (segments.length === 0) {
    return "";
  }

  const line1 = segments[0] ?? "";

  const wardLike =
    segments.find((s) => /(phường|xã|thị trấn|ward|commune|township)/i.test(s)) ??
    (segments.length >= 2 ? segments[1] : "");

  const districtLike =
    segments.find((s) => /(quận|huyện|district|county|thành phố thủ đức|tp\.? thủ đức)/i.test(s)) ??
    (segments.length >= 3 ? segments[2] : "");

  const cityLike =
    segments.find((s) => /(thành phố|tp\.?|city|hà nội|hồ chí minh|đà nẵng|cần thơ|hải phòng)/i.test(s)) ??
    (segments.length >= 4 ? segments[3] : "");

  return dedupe([line1, wardLike, districtLike, cityLike]).join(", ");
}

function toSuggestionId(prefix: string, label: string, latitude?: number, longitude?: number): string {
  return `${prefix}_${label}_${latitude ?? "x"}_${longitude ?? "y"}`;
}

export function useAddressAutocomplete(query: string, bias?: GeoBias) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const keyword = query.trim();

    // Build the current-location suggestion (always first when available)
    const currentLocationSuggestion: AddressSuggestion | null = bias?.currentLocation
      ? {
          id: "current_location",
          label: bias.currentLocation.label,
          latitude: bias.currentLocation.latitude,
          longitude: bias.currentLocation.longitude,
          isCurrentLocation: true,
        }
      : null;

    if (keyword.length < 2) {
      setSuggestions(currentLocationSuggestion ? [currentLocationSuggestion] : []);
      setLoading(false);
      return;
    }

    const seq = Date.now();
    requestSeqRef.current = seq;

    // Phase 6: Delay loading indicator to prevent flicker (only show after 1s)
    let loadingTimeoutId: NodeJS.Timeout;

    const timer = setTimeout(async () => {
      try {
        // Phase 6: Set loading after 1 second delay to prevent UI flicker
        loadingTimeoutId = setTimeout(() => {
          if (requestSeqRef.current === seq) {
            setLoading(true);
          }
        }, 1000);

        // Phase 2: Check cache first
        const cachedResults = addressCache.get(keyword, bias?.latitude, bias?.longitude);
        if (cachedResults && cachedResults.length > 0) {
          clearTimeout(loadingTimeoutId);
          if (requestSeqRef.current === seq) {
            setSuggestions(cachedResults);
            setLoading(false);
          }
          return;
        }

        // Phase 2: Use request deduplicator + cache storage
        const cacheKey = `${keyword}_${bias?.latitude}_${bias?.longitude}`;
        const results = await requestDeduplicator.execute(cacheKey, async () => {
          const nextSuggestions: AddressSuggestion[] = [];

          if (hasGooglePlacesKey()) {
            // Google Places Autocomplete — accurate Vietnamese addresses
            try {
              const googleResults = await searchGooglePlacesAutocomplete(keyword, bias, 4);
              for (const place of googleResults) {
                nextSuggestions.push({
                  id: `google_${place.placeId}`,
                  label: place.label,
                  placeId: place.placeId,
                });
              }
            } catch {
              // Google failed, fall through to Nominatim
            }
          }

          // Nominatim fallback when Google is unavailable or returned 0 results
          if (nextSuggestions.length === 0) {
            const nominatimParams = new URLSearchParams({
              q: keyword,
              format: "jsonv2",
              limit: "4",
              addressdetails: "1",
              "accept-language": "vi",
            });

            if (bias) {
              const viewbox = getViewboxParams(bias.latitude, bias.longitude);
              nominatimParams.set("viewbox", viewbox.viewbox);
              nominatimParams.set("bounded", viewbox.bounded);
            }

            try {
              const nominatimResponse = await fetchWithTimeout(
                `https://nominatim.openstreetmap.org/search?${nominatimParams.toString()}`,
                { headers: { Accept: "application/json" } },
                5000,
              );

              if (nominatimResponse.ok) {
                const payload = (await nominatimResponse.json()) as Array<{
                  display_name?: string;
                  lat?: string;
                  lon?: string;
                  address?: Record<string, unknown>;
                }>;

                for (const item of payload ?? []) {
                  const fromStructured = buildLabelFromStructuredAddress(item.address ?? {});
                  const fromDisplay = buildLabelFromDisplayName(item.display_name);
                  const label = fromStructured || fromDisplay;
                  if (!label) continue;

                  const latitude = item.lat ? Number(item.lat) : undefined;
                  const longitude = item.lon ? Number(item.lon) : undefined;

                  nextSuggestions.push({
                    id: toSuggestionId("nominatim", label, latitude, longitude),
                    label,
                    latitude: Number.isFinite(latitude) ? latitude : undefined,
                    longitude: Number.isFinite(longitude) ? longitude : undefined,
                  });
                }
              }
            } catch {
              // Nominatim failed
            }
          }

          // Photon fallback when still short on results
          if (nextSuggestions.length === 0) {
            const photonParams = new URLSearchParams({ q: keyword, limit: "4", lang: "vi" });

            if (bias) {
              photonParams.set("lat", String(bias.latitude));
              photonParams.set("lon", String(bias.longitude));
              photonParams.set("zoom", String(getZoomFromAccuracy(bias.accuracy)));
            }

            try {
              const photonResponse = await fetchWithTimeout(
                `https://photon.komoot.io/api?${photonParams.toString()}`,
                { headers: { Accept: "application/json" } },
                5000,
              );

              if (photonResponse.ok) {
                const payload = (await photonResponse.json()) as {
                  features?: Array<{
                    geometry?: { coordinates?: number[] };
                    properties?: Record<string, unknown>;
                  }>;
                };

                for (const feature of payload.features ?? []) {
                  const label = buildLabelFromStructuredAddress(feature.properties ?? {});
                  if (!label) continue;

                  const coordinates = feature.geometry?.coordinates ?? [];
                  const longitude = typeof coordinates[0] === "number" ? coordinates[0] : undefined;
                  const latitude = typeof coordinates[1] === "number" ? coordinates[1] : undefined;

                  nextSuggestions.push({
                    id: toSuggestionId("photon", label, latitude, longitude),
                    label,
                    latitude,
                    longitude,
                  });
                }
              }
            } catch {
              // Photon failed
            }
          }

          // Device geocoder as final fallback
          if (nextSuggestions.length === 0) {
            try {
              const geoResults = await Location.geocodeAsync(keyword);
              for (const item of geoResults.slice(0, 4)) {
                if (typeof item.latitude !== "number" || typeof item.longitude !== "number") continue;

                try {
                  const reverse = await Location.reverseGeocodeAsync({
                    latitude: item.latitude,
                    longitude: item.longitude,
                  });
                  const label =
                    formatAddressFromGeocode(reverse[0]) ??
                    buildLabelFromStructuredAddress((reverse[0] ?? {}) as Record<string, unknown>);
                  if (!label) continue;

                  nextSuggestions.push({
                    id: toSuggestionId("device", label, item.latitude, item.longitude),
                    label,
                    latitude: item.latitude,
                    longitude: item.longitude,
                  });
                } catch {
                  // ignore single item failure
                }
              }
            } catch {
              // Device geocoder failed
            }
          }

          // For non-Google results: deduplicate + rank by proximity
          const deduped = nextSuggestions.filter(
            (item, index) =>
              nextSuggestions.findIndex((x) => x.label.toLowerCase() === item.label.toLowerCase()) === index,
          );

          const scored = deduped.map((suggestion) => {
            let score = 0;
            if (bias && suggestion.latitude && suggestion.longitude) {
              const distance = calculateDistance(bias.latitude, bias.longitude, suggestion.latitude, suggestion.longitude);
              score = calculateRankingScore(distance, keyword, suggestion.label);
              score *= applyDistancePenalty(distance);
            } else {
              score = calculateMatchQuality(keyword, suggestion.label);
            }
            return { ...suggestion, score };
          });

          const searchResults = scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 4);

          // Prepend current location suggestion
          return currentLocationSuggestion
            ? [currentLocationSuggestion, ...searchResults]
            : searchResults;
        });

        if (requestSeqRef.current !== seq) {
          return;
        }

        // Phase 2: Cache the results
        clearTimeout(loadingTimeoutId);
        addressCache.set(keyword, results, bias?.latitude, bias?.longitude);

        setSuggestions(results);
      } catch (error) {
        clearTimeout(loadingTimeoutId);
        if (requestSeqRef.current === seq) {
          setSuggestions([]);
          // Phase 6: Show error message if all sources fail
          if (error instanceof Error && error.name !== "AbortError") {
            console.error("Address autocomplete failed:", error.message);
          }
        }
      } finally {
        if (requestSeqRef.current === seq) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      clearTimeout(loadingTimeoutId);
    };
  }, [query, bias?.latitude, bias?.longitude, bias?.currentLocation?.label]);

  return { suggestions, loading };
}
