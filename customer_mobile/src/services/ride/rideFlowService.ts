import { QUERY_KEYS } from "../../constants";
import {
  CreateRideBookingRequest,
  CreateRideBookingResponse,
  DriverAllocationStatusResponse,
  RideCouponPreview,
  RidePaymentMethodOption,
  RidePricingEstimateRequest,
  RidePricingEstimateResponse,
  RideRouteEstimateRequest,
  RideRouteEstimateResponse,
  RideVehicleOption,
} from "../../types";
import { apiClient } from "../api/client";
import { ApiError } from "../api/errors";
import { mockDelay } from "../mock/mockDelay";

const USE_MOCK_RIDE_FLOW = true;
const allocationPollCount: Record<string, number> = {};

const baseRoute: RideRouteEstimateResponse = {
  routeId: "route_mock_1",
  distanceKm: 8.2,
  etaMinutes: 22,
  polyline: "mock_polyline",
  polylineCoordinates: [
    { latitude: 10.773, longitude: 106.699 },
    { latitude: 10.778, longitude: 106.703 },
    { latitude: 10.785, longitude: 106.709 },
    { latitude: 10.792, longitude: 106.713 },
  ],
  pickup: {
    address: "",
    coordinate: { latitude: 10.773, longitude: 106.699 },
  },
  destination: {
    address: "",
    coordinate: { latitude: 10.792, longitude: 106.713 },
  },
  stops: [],
};

const vehicleOptions: RideVehicleOption[] = [
  {
    vehicleCode: "BIKE",
    displayName: "Xe máy",
    description: "Đi nhanh trong nội thành",
    seats: 1,
    etaPickupMinutes: 2,
    baseFare: 12000,
    perKmFare: 4200,
    serviceFee: 4000,
    bookingFee: 3000,
  },
  {
    vehicleCode: "CAR_4",
    displayName: "Xe 4 chỗ",
    description: "Tiện lợi cho cả nhóm nhỏ",
    seats: 4,
    etaPickupMinutes: 4,
    baseFare: 25000,
    perKmFare: 8200,
    serviceFee: 8000,
    bookingFee: 5000,
  },
  {
    vehicleCode: "CAR_7",
    displayName: "Xe 7 chỗ",
    description: "Phù hợp gia đình và hành lý",
    seats: 7,
    etaPickupMinutes: 6,
    baseFare: 35000,
    perKmFare: 9800,
    serviceFee: 10000,
    bookingFee: 7000,
  },
];

const paymentMethods: RidePaymentMethodOption[] = [
  { id: "wallet", type: "WALLET", displayName: "Ví ThueXe", subtitle: "Số dư khả dụng" },
  { id: "cash", type: "CASH", displayName: "Tiền mặt" },
  { id: "momo", type: "MOMO", displayName: "MOMO" },
];

const coupons: RideCouponPreview[] = [
  { code: "XEMOI30", description: "Giảm 30k chuyến đầu", discountText: "-30.000d" },
  { code: "DIHOI10", description: "Giảm 10% tối đa 20k", discountText: "-10%" },
];

function throwError(code: string, message: string, status: number): never {
  throw new ApiError({ code, message, status });
}

function computeDiscount(totalBeforeDiscount: number, couponCode?: string): number {
  if (!couponCode) {
    return 0;
  }

  const upper = couponCode.toUpperCase();

  if (upper === "XEMOI30") {
    return Math.min(30000, totalBeforeDiscount);
  }

  if (upper === "DIHOI10") {
    return Math.min(Math.round(totalBeforeDiscount * 0.1), 20000);
  }

  return 0;
}

export const rideFlowService = {
  getRouteEstimate: async (payload: RideRouteEstimateRequest): Promise<RideRouteEstimateResponse> => {
    if (USE_MOCK_RIDE_FLOW) {
      await mockDelay(600);

      if (payload.pickupAddress.toLowerCase().includes("map-error") || payload.destinationAddress.toLowerCase().includes("map-error")) {
        throwError("MAP_API_ERROR", "Dịch vụ map không phản hồi", 502);
      }

      if (payload.destinationAddress.toLowerCase().includes("eta-error")) {
        throwError("ETA_UNAVAILABLE", "Không tính được ETA cho lộ trình này", 422);
      }

      const stopAddresses = payload.stopAddresses.filter(Boolean).slice(0, 2);
      const stops = stopAddresses.map((address, index) => ({
        address,
        coordinate: {
          latitude: 10.778 + index * 0.003,
          longitude: 106.704 + index * 0.003,
        },
      }));

      return {
        ...baseRoute,
        routeId: `route_${Date.now()}`,
        distanceKm: baseRoute.distanceKm + stopAddresses.length * 1.8,
        etaMinutes: baseRoute.etaMinutes + stopAddresses.length * 6,
        pickup: {
          ...baseRoute.pickup,
          address: payload.pickupAddress,
          coordinate: payload.currentLocation ?? baseRoute.pickup.coordinate,
        },
        destination: {
          ...baseRoute.destination,
          address: payload.destinationAddress,
        },
        stops,
      };
    }

    const response = await apiClient.post<RideRouteEstimateResponse>("/rides/routes/estimate", payload);
    return response.data;
  },

  getVehicleOptions: async (_routeId: string): Promise<RideVehicleOption[]> => {
    if (USE_MOCK_RIDE_FLOW) {
      await mockDelay(300);
      return vehicleOptions;
    }

    const response = await apiClient.get<RideVehicleOption[]>(`/rides/tariffs/options?routeId=${_routeId}`);
    return response.data;
  },

  getPaymentMethods: async (): Promise<RidePaymentMethodOption[]> => {
    if (USE_MOCK_RIDE_FLOW) {
      await mockDelay(200);
      return paymentMethods;
    }

    const response = await apiClient.get<RidePaymentMethodOption[]>("/payments/methods");
    return response.data;
  },

  getAvailableCoupons: async (): Promise<RideCouponPreview[]> => {
    if (USE_MOCK_RIDE_FLOW) {
      await mockDelay(180);
      return coupons;
    }

    const response = await apiClient.get<RideCouponPreview[]>("/coupon_codes/quick");
    return response.data;
  },

  estimatePricing: async (payload: RidePricingEstimateRequest): Promise<RidePricingEstimateResponse> => {
    if (USE_MOCK_RIDE_FLOW) {
      await mockDelay(500);

      if (payload.vehicleCode === "PRICING_ERROR") {
        throwError("PRICING_ERROR", "Không tính được bảng giá", 500);
      }

      const vehicle = vehicleOptions.find((item) => item.vehicleCode === payload.vehicleCode);

      if (!vehicle) {
        throwError("PRICING_ERROR", "Không tìm thấy loại xe", 404);
      }

      const routeDistance = 8.2;
      const estimatedFare = vehicle.baseFare;
      const distanceFee = Math.round(vehicle.perKmFare * routeDistance);
      const surcharge = payload.scheduledAt ? 7000 : 0;
      const subtotal = estimatedFare + distanceFee + vehicle.serviceFee + vehicle.bookingFee + surcharge;
      const discount = computeDiscount(subtotal, payload.couponCode);

      return {
        tariffId: `tariff_${payload.vehicleCode}`,
        routeId: payload.routeId,
        vehicleCode: payload.vehicleCode,
        couponCodeApplied: discount > 0 ? payload.couponCode : undefined,
        breakdown: {
          estimatedFare,
          distanceFee,
          serviceFee: vehicle.serviceFee,
          bookingFee: vehicle.bookingFee,
          surcharge,
          discount,
          totalPayable: subtotal - discount,
          currency: "VND",
        },
      };
    }

    const response = await apiClient.post<RidePricingEstimateResponse>("/rides/pricing/estimate", payload);
    return response.data;
  },

  createRideBooking: async (payload: CreateRideBookingRequest): Promise<CreateRideBookingResponse> => {
    if (USE_MOCK_RIDE_FLOW) {
      await mockDelay(600);

      if (payload.pickupAddress.toLowerCase().includes("booking-error")) {
        throwError("BOOKING_CREATE_ERROR", "Không tạo được booking", 500);
      }

      if (payload.pickupAddress.toLowerCase().includes("offline")) {
        throwError("NETWORK_ERROR", "Không có kết nối mạng", 0);
      }

      const bookingId = `booking_${Date.now()}`;
      allocationPollCount[bookingId] = 0;

      return {
        bookingId,
        rideId: `ride_${Date.now()}`,
        bookingStatus: payload.bookingType === "SCHEDULED" ? "SCHEDULED" : "PENDING",
        message:
          payload.bookingType === "SCHEDULED"
            ? "Đặt lịch thành công"
            : "Đã tạo booking đang tìm tài xế",
      };
    }

    const response = await apiClient.post<CreateRideBookingResponse>("/bookings/rides", payload);
    return response.data;
  },

  getDriverAllocationStatus: async (bookingId: string): Promise<DriverAllocationStatusResponse> => {
    if (USE_MOCK_RIDE_FLOW) {
      await mockDelay(350);
      allocationPollCount[bookingId] = (allocationPollCount[bookingId] ?? 0) + 1;

      if (bookingId.includes("nodriver")) {
        return {
          bookingId,
          allocationStatus: "FAILED",
          reason: "Không tìm thấy tài xế phù hợp trong khu vực",
        };
      }

      if ((allocationPollCount[bookingId] ?? 0) < 3) {
        return {
          bookingId,
          allocationStatus: "SEARCHING",
        };
      }

      return {
        bookingId,
        allocationStatus: "ALLOCATED",
        driverId: "driver_1",
        driverName: "Tran Van B",
        driverPhone: "0988111222",
        vehiclePlate: "51H-123.45",
        etaPickupMinutes: 4,
      };
    }

    const response = await apiClient.get<DriverAllocationStatusResponse>(`/driver_allocate/status?bookingId=${bookingId}`);
    return response.data;
  },

  retryDriverAllocation: async (bookingId: string): Promise<DriverAllocationStatusResponse> => {
    if (USE_MOCK_RIDE_FLOW) {
      allocationPollCount[bookingId] = 0;
      await mockDelay(250);
      return {
        bookingId,
        allocationStatus: "SEARCHING",
      };
    }

    const response = await apiClient.post<DriverAllocationStatusResponse>("/driver_allocate/retry", { bookingId });
    return response.data;
  },
};

export const rideFlowQueryKeys = {
  routeEstimate: (pickupAddress: string, destinationAddress: string, stopAddresses: string[]) =>
    [...QUERY_KEYS.rideRouteEstimate, pickupAddress, destinationAddress, ...stopAddresses] as const,
  vehicleOptions: (routeId?: string) => [...QUERY_KEYS.rideVehicleOptions, routeId ?? "none"] as const,
  pricing: (routeId?: string, vehicleCode?: string, paymentMethodId?: string, couponCode?: string, scheduledAt?: string) =>
    [
      ...QUERY_KEYS.ridePricing,
      routeId ?? "none",
      vehicleCode ?? "none",
      paymentMethodId ?? "none",
      couponCode ?? "none",
      scheduledAt ?? "now",
    ] as const,
  driverAllocation: (bookingId: string) => [...QUERY_KEYS.driverAllocation, bookingId] as const,
};
