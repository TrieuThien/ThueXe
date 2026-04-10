import { mockRentalBookings, mockRideBookings } from "./mock/data";
import { mockDelay } from "./mock/mockDelay";
import { RentalBooking, RideBooking } from "../types";

export const bookingService = {
  getRideBookings: async (): Promise<RideBooking[]> => {
    await mockDelay();
    return mockRideBookings;
  },
  getRentalBookings: async (): Promise<RentalBooking[]> => {
    await mockDelay();
    return mockRentalBookings;
  },
};
