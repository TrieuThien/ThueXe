import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

import { formatAddressFromGeocode } from "../utils/address";

interface GeoBias {
  latitude: number;
  longitude: number;
}

export interface AddressSuggestion {
  id: string;
  label: string;
  latitude?: number;
  longitude?: number;
}

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
    if (keyword.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const seq = Date.now();
    requestSeqRef.current = seq;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const nextSuggestions: AddressSuggestion[] = [];

        // 1) Prefer Nominatim first for richer addressdetails.
        const nominatimParams = new URLSearchParams({
          q: keyword,
          format: "jsonv2",
          limit: "6",
          addressdetails: "1",
          "accept-language": "vi",
        });

        const nominatimResponse = await fetch(`https://nominatim.openstreetmap.org/search?${nominatimParams.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

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
            if (!label) {
              continue;
            }

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

        // 2) Add Photon as side-source if still short on results.
        if (nextSuggestions.length < 6) {
          const photonParams = new URLSearchParams({
            q: keyword,
            limit: "6",
            lang: "vi",
          });

          if (bias) {
            photonParams.set("lat", String(bias.latitude));
            photonParams.set("lon", String(bias.longitude));
            photonParams.set("zoom", "14");
          }

          const photonResponse = await fetch(`https://photon.komoot.io/api?${photonParams.toString()}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });

          if (photonResponse.ok) {
            const payload = (await photonResponse.json()) as {
              features?: Array<{
                geometry?: { coordinates?: number[] };
                properties?: Record<string, unknown>;
              }>;
            };

            for (const feature of payload.features ?? []) {
              const label = buildLabelFromStructuredAddress(feature.properties ?? {});
              if (!label) {
                continue;
              }

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
        }

        // 3) Final fallback: device geocoder.
        if (nextSuggestions.length === 0) {
          const geoResults = await Location.geocodeAsync(keyword);
          for (const item of geoResults.slice(0, 5)) {
            if (typeof item.latitude !== "number" || typeof item.longitude !== "number") {
              continue;
            }

            try {
              const reverse = await Location.reverseGeocodeAsync({
                latitude: item.latitude,
                longitude: item.longitude,
              });
              const label =
                formatAddressFromGeocode(reverse[0]) ??
                buildLabelFromStructuredAddress((reverse[0] ?? {}) as Record<string, unknown>);
              if (!label) {
                continue;
              }

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
        }

        if (requestSeqRef.current !== seq) {
          return;
        }

        const deduped = nextSuggestions.filter(
          (item, index) => nextSuggestions.findIndex((x) => x.label.toLowerCase() === item.label.toLowerCase()) === index,
        );

        setSuggestions(deduped.slice(0, 6));
      } catch {
        if (requestSeqRef.current === seq) {
          setSuggestions([]);
        }
      } finally {
        if (requestSeqRef.current === seq) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, bias?.latitude, bias?.longitude]);

  return { suggestions, loading };
}
