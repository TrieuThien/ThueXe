import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEY_FACTORY } from "../../constants";
import { rentalApi } from "../../services";
import { useAuthStore } from "../../store";

export function useRental(serviceType?: 1 | 2 | 3, rentalId?: string | number) {
  const queryClient = useQueryClient();
  const setCurrentRental = useAuthStore((state) => state.setCurrentRental);

  const packagesQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.rentalPackages.list(serviceType ?? "none"),
    queryFn: () => rentalApi.getPackages(serviceType as 1 | 2 | 3),
    enabled: Boolean(serviceType),
  });

  const currentRentalQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.bookings.currentRental(),
    queryFn: rentalApi.getCurrentBooking,
  });

  const rentalDetailQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.bookings.detail(rentalId ?? "none"),
    queryFn: () => rentalApi.getBookingDetail(rentalId as string | number),
    enabled: Boolean(rentalId),
  });

  const createRentalMutation = useMutation({
    mutationFn: (payload: unknown) => rentalApi.createBooking(payload),
    onSuccess: async (response) => {
      setCurrentRental(response.data as Record<string, unknown>);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.bookings.currentRental() }),
        queryClient.invalidateQueries({ queryKey: ["bookings", "rental", "history"] }),
      ]);
    },
  });

  return {
    packagesQuery,
    currentRentalQuery,
    rentalDetailQuery,
    createRentalMutation,
  };
}
