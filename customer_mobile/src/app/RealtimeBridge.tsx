import { useEffect, useMemo } from "react";

import { useRealtime } from "../hooks";
import { useAuthStore } from "../store";
import { initSocketConnection } from "../services";

export function RealtimeBridge() {
  const currentBooking = useAuthStore((state) => state.currentBooking);
  const currentRental = useAuthStore((state) => state.currentRental);
  const accessToken = useAuthStore((state) => state.accessToken);

  const bookingId = useMemo(() => {
    const rideBookingId = currentBooking?.booking_id ?? currentBooking?.bookingId;
    const rentalBookingId = currentRental?.booking_id ?? currentRental?.bookingId;
    return (rideBookingId ?? rentalBookingId ?? undefined) as string | number | undefined;
  }, [currentBooking, currentRental]);

  useRealtime({ bookingId });

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (accessToken) {
      initSocketConnection();
    }
  }, [accessToken]);

  return null;
}
