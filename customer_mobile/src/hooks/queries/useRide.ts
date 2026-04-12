import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEY_FACTORY } from "../../constants";
import { rideApi } from "../../services";
import { useAuthStore } from "../../store";

export function useRide(bookingId?: string | number) {
  const queryClient = useQueryClient();
  const setCurrentBooking = useAuthStore((state) => state.setCurrentBooking);

  const currentBookingQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.bookings.currentRide(),
    queryFn: rideApi.getCurrentBooking,
  });

  const bookingDetailQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.bookings.detail(bookingId ?? "none"),
    queryFn: () => rideApi.getBookingDetail(bookingId as string | number),
    enabled: Boolean(bookingId),
  });

  const createBookingMutation = useMutation({
    mutationFn: (payload: unknown) => rideApi.createBooking(payload),
    onSuccess: async (response) => {
      const created = response.data as Record<string, unknown>;
      setCurrentBooking(created);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.bookings.currentRide() }),
        queryClient.invalidateQueries({ queryKey: ["bookings", "ride", "history"] }),
      ]);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (payload: { bookingId: string | number; reason?: string }) =>
      rideApi.cancelBooking(payload.bookingId, { reason: payload.reason }),
    onSuccess: async (_, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.bookings.currentRide() }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.bookings.detail(vars.bookingId) }),
      ]);
    },
  });

  return {
    currentBookingQuery,
    bookingDetailQuery,
    createBookingMutation,
    cancelBookingMutation,
  };
}
