import { create } from "zustand";

import { RideType } from "../types";

interface BookingDraftState {
  selectedRideType: RideType;
  pickupAddress: string;
  destinationAddress: string;
  setRideType: (rideType: RideType) => void;
  setLocations: (pickupAddress: string, destinationAddress: string) => void;
  resetDraft: () => void;
}

const initialState = {
  selectedRideType: "CALL_RIDE" as RideType,
  pickupAddress: "",
  destinationAddress: "",
};

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  ...initialState,
  setRideType: (selectedRideType) => set({ selectedRideType }),
  setLocations: (pickupAddress, destinationAddress) => set({ pickupAddress, destinationAddress }),
  resetDraft: () => set(initialState),
}));
