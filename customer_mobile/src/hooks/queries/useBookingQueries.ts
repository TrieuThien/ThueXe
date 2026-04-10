import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "../../constants";
import { bookingService } from "../../services";

export function useRideBookingsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.rideBookings,
    queryFn: bookingService.getRideBookings,
  });
}

export function useRentalBookingsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.rentalBookings,
    queryFn: bookingService.getRentalBookings,
  });
}
