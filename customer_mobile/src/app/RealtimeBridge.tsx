import { useMemo } from "react";

import { useRealtime } from "../hooks";
import { useAuthStore } from "../store";

export function RealtimeBridge() {
  const currentBooking = useAuthStore((state) => state.currentBooking);
  const currentRental = useAuthStore((state) => state.currentRental);

  const bookingId = useMemo(() => {
    const rideBookingId = currentBooking?.booking_id ?? currentBooking?.bookingId;
    const rentalBookingId = currentRental?.booking_id ?? currentRental?.bookingId;
    return (rideBookingId ?? rentalBookingId ?? undefined) as string | number | undefined;
  }, [currentBooking, currentRental]);

  useRealtime({ bookingId });

  return null;
}
