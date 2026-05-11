import { create } from 'zustand';

type PendingRentalNav = {
  rentalId: string;
  pickupLat?: number;
  pickupLng?: number;
};

type DriverHireState = {
  pendingRentalNav: PendingRentalNav | null;
  setPendingRentalNav: (nav: PendingRentalNav | null) => void;
};

export const useDriverHireStore = create<DriverHireState>((set) => ({
  pendingRentalNav: null,
  setPendingRentalNav: (nav) => set({ pendingRentalNav: nav }),
}));
