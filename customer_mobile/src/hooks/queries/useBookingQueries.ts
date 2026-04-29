import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "../../constants";
import { bookingService } from "../../services";

export function useRideBookingsQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.rideBookings,
    queryFn: bookingService.getRideBookings,
    enabled,
  });
}

export function useRentalBookingsQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.rentalBookings,
    queryFn: bookingService.getRentalBookings,
    enabled,
  });
}
