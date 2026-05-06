import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { rentalApi } from "../services";

const INTERVAL_MS = 30_000;

export function useRentalLocationTracking(
  rentalId: string | number | undefined,
  isActive: boolean
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!rentalId || !isActive) return;

    async function sendLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await rentalApi.sendLocation(rentalId!, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      } catch {
        // Silent fail — không ảnh hưởng UX
      }
    }

    sendLocation();
    timerRef.current = setInterval(sendLocation, INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [rentalId, isActive]);
}
