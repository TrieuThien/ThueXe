import { create } from "zustand";

import {
  Coordinate,
  CreateRideBookingRequest,
  RidePricingEstimateResponse,
  RideRouteEstimateResponse,
} from "../types";

interface RideFlowDraftState {
  pickupAddress: string;
  destinationAddress: string;
  stopAddresses: string[];
  isScheduled: boolean;
  scheduledAt?: string;
  currentLocation?: Coordinate;
  routeEstimate?: RideRouteEstimateResponse;
  selectedVehicleCode?: string;
  paymentMethodId?: string;
  couponCode?: string;
  pricingEstimate?: RidePricingEstimateResponse;
  note?: string;
  setLocationDraft: (params: {
    pickupAddress: string;
    destinationAddress: string;
    stopAddresses: string[];
    isScheduled: boolean;
    scheduledAt?: string;
    currentLocation?: Coordinate;
    routeEstimate: RideRouteEstimateResponse;
  }) => void;
  setVehicleSelection: (params: { vehicleCode: string; paymentMethodId: string }) => void;
  setCouponCode: (couponCode?: string) => void;
  setPricingEstimate: (pricing?: RidePricingEstimateResponse) => void;
  setNote: (note: string) => void;
  buildCreateBookingPayload: () => CreateRideBookingRequest | null;
  resetRideFlow: () => void;
}

const initialState = {
  pickupAddress: "",
  destinationAddress: "",
  stopAddresses: [],
  isScheduled: false,
  scheduledAt: undefined,
  currentLocation: undefined,
  routeEstimate: undefined,
  selectedVehicleCode: undefined,
  paymentMethodId: undefined,
  couponCode: undefined,
  pricingEstimate: undefined,
  note: undefined,
};

export const useRideFlowStore = create<RideFlowDraftState>((set, get) => ({
  ...initialState,
  setLocationDraft: (params) =>
    set({
      pickupAddress: params.pickupAddress,
      destinationAddress: params.destinationAddress,
      stopAddresses: params.stopAddresses,
      isScheduled: params.isScheduled,
      scheduledAt: params.scheduledAt,
      currentLocation: params.currentLocation,
      routeEstimate: params.routeEstimate,
      pricingEstimate: undefined,
    }),
  setVehicleSelection: ({ vehicleCode, paymentMethodId }) =>
    set({ selectedVehicleCode: vehicleCode, paymentMethodId, pricingEstimate: undefined }),
  setCouponCode: (couponCode) => set({ couponCode, pricingEstimate: undefined }),
  setPricingEstimate: (pricingEstimate) => set({ pricingEstimate }),
  setNote: (note) => set({ note }),
  buildCreateBookingPayload: () => {
    const state = get();

    if (!state.routeEstimate || !state.pricingEstimate || !state.selectedVehicleCode || !state.paymentMethodId) {
      return null;
    }

    return {
      bookingType: state.isScheduled ? "SCHEDULED" : "IMMEDIATE",
      scheduledAt: state.scheduledAt,
      pickupAddress: state.pickupAddress,
      destinationAddress: state.destinationAddress,
      stopAddresses: state.stopAddresses,
      routeId: state.routeEstimate.routeId,
      tariffId: state.pricingEstimate.tariffId,
      vehicleCode: state.selectedVehicleCode,
      paymentMethodId: state.paymentMethodId,
      couponCode: state.couponCode,
      note: state.note,
      currentLocation: state.currentLocation,
      pickupCoordinate: state.routeEstimate.pickup.coordinate,
      destinationCoordinate: state.routeEstimate.destination.coordinate,
      stopCoordinates: state.routeEstimate.stops.map((item) => item.coordinate),
      distanceKm: state.routeEstimate.distanceKm,
      durationMin: state.routeEstimate.etaMinutes,
      numSeats: 1,
    };
  },
  resetRideFlow: () => set(initialState),
}));
