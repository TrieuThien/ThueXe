import { create } from "zustand";

import {
  CreateRentalBookingRequest,
  RentalPackageItem,
  RentalPricingResponse,
  RentalSearchCriteria,
  RentalServiceType,
} from "../types";

interface RentalFlowState {
  selectedServiceType: RentalServiceType | null;
  criteria: RentalSearchCriteria | null;
  selectedPackage: RentalPackageItem | null;
  pricing: RentalPricingResponse | null;
  couponCode?: string;
  note?: string;
  setServiceType: (serviceType: RentalServiceType) => void;
  setCriteria: (criteria: RentalSearchCriteria) => void;
  setSelectedPackage: (item: RentalPackageItem) => void;
  setPricing: (pricing: RentalPricingResponse | null) => void;
  setExtraInfo: (couponCode?: string, note?: string) => void;
  buildCreatePayload: () => CreateRentalBookingRequest | null;
  resetRentalFlow: () => void;
}

const initialState = {
  selectedServiceType: null,
  criteria: null,
  selectedPackage: null,
  pricing: null,
  couponCode: undefined,
  note: undefined,
};

export const useRentalFlowStore = create<RentalFlowState>((set, get) => ({
  ...initialState,
  setServiceType: (selectedServiceType) => set({ selectedServiceType }),
  setCriteria: (criteria) => set({ criteria, pricing: null, selectedPackage: null }),
  setSelectedPackage: (selectedPackage) => set({ selectedPackage, pricing: null }),
  setPricing: (pricing) => set({ pricing }),
  setExtraInfo: (couponCode, note) => set({ couponCode, note }),
  buildCreatePayload: () => {
    const state = get();
    if (!state.criteria || !state.selectedPackage || !state.selectedServiceType) {
      return null;
    }

    return {
      serviceType: state.selectedServiceType,
      packageId: state.selectedPackage.packageId,
      startAt: state.criteria.startAt,
      durationHours: state.criteria.durationHours,
      pickupAddress: state.criteria.pickupAddress,
      dropoffAddress: state.criteria.dropoffAddress,
      couponCode: state.couponCode,
      note: state.note,
      pickupCoordinate: state.criteria.pickupCoordinate,
    };
  },
  resetRentalFlow: () => set(initialState),
}));
