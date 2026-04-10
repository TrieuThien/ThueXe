import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

import { formatAddressFromGeocode, formatCoordinateAddress } from "../utils/address";

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  capturedAt: string;
  address?: string;
}

export function useCurrentLocation(autoFetch = true) {
  const [data, setData] = useState<DeviceLocation | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const activeRequestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetData = useCallback((updater: (prev: DeviceLocation | null) => DeviceLocation | null) => {
    if (!mountedRef.current) {
      return;
    }
    setData(updater);
  }, []);

  const reverseGeocodeInBackground = useCallback(
    async (params: { latitude: number; longitude: number; requestId: number }) => {
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: params.latitude,
          longitude: params.longitude,
        });

        if (!mountedRef.current || activeRequestIdRef.current !== params.requestId) {
          return;
        }

        const resolvedAddress = formatAddressFromGeocode(geocode[0]);
        if (!resolvedAddress) {
          return;
        }

        safeSetData((prev) => {
          if (!prev) {
            return prev;
          }

          const sameCoordinate =
            Math.abs(prev.latitude - params.latitude) < 0.0002 &&
            Math.abs(prev.longitude - params.longitude) < 0.0002;

          if (!sameCoordinate) {
            return prev;
          }

          return {
            ...prev,
            address: resolvedAddress,
          };
        });
      } catch {
        // Reverse geocode can fail intermittently; keep coordinate fallback address.
      }
    },
    [safeSetData],
  );

  const fetchLocation = useCallback(async () => {
    const requestId = Date.now();
    activeRequestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error("Khong duoc cap quyen vi tri");
      }

      // 1) Fill immediately from cache/last-known location.
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 1000 * 60 * 10,
        requiredAccuracy: 200,
      });

      if (lastKnown && mountedRef.current && activeRequestIdRef.current === requestId) {
        safeSetData(() => ({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          accuracy: lastKnown.coords.accuracy,
          capturedAt: new Date(lastKnown.timestamp).toISOString(),
          address: formatCoordinateAddress(lastKnown.coords.latitude, lastKnown.coords.longitude),
        }));
        setLoading(false);
        void reverseGeocodeInBackground({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          requestId,
        });
      }

      // 2) Refresh with current GPS position.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!mountedRef.current || activeRequestIdRef.current !== requestId) {
        return;
      }

      safeSetData(() => ({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date(position.timestamp).toISOString(),
        address: formatCoordinateAddress(position.coords.latitude, position.coords.longitude),
      }));

      setLoading(false);
      void reverseGeocodeInBackground({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        requestId,
      });
    } catch (err) {
      if (mountedRef.current && activeRequestIdRef.current === requestId) {
        setError(err instanceof Error ? err.message : "Không lấy được vị trí hiện tại.");
      }
    } finally {
      if (mountedRef.current && activeRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [reverseGeocodeInBackground, safeSetData]);

  useEffect(() => {
    if (autoFetch) {
      void fetchLocation();
    }
  }, [autoFetch, fetchLocation]);

  return {
    data,
    loading,
    error,
    fetchLocation,
  };
}
