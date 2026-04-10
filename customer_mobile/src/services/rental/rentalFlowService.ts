import {
  CreateRentalBookingRequest,
  CreateRentalBookingResponse,
  RentalPackageItem,
  RentalPackageListResponse,
  RentalPricingRequest,
  RentalPricingResponse,
  RentalSearchCriteria,
} from "../../types";
import { apiClient } from "../api/client";
import { ApiError } from "../api/errors";
import { mockDelay } from "../mock/mockDelay";

const USE_MOCK_RENTAL = true;

function throwError(code: string, message: string, status: number): never {
  throw new ApiError({ code, message, status });
}

const basePackages: RentalPackageItem[] = [
  {
    packageId: "pkg_car_4h",
    packageName: "Gói 4 giờ - Thuê xe tự lái",
    serviceType: "RENTAL_CAR",
    vehicleTypeName: "Sedan",
    basePrice: 450000,
    totalEstimatedPrice: 450000,
    currency: "VND",
    availableVehicles: 7,
    conditions: {
      securityDeposit: 1000000,
      distanceLimitKm: 60,
      overtimeFeePerHour: 120000,
      overDistanceFeePerKm: 6000,
    },
    highlights: ["Bao hiem co ban", "Giao xe tan noi"],
  },
  {
    packageId: "pkg_driver_4h",
    packageName: "Gói 4 giờ - Tài xế riêng",
    serviceType: "RENTAL_DRIVER",
    driverLevel: "4.8+ sao",
    basePrice: 320000,
    totalEstimatedPrice: 320000,
    currency: "VND",
    availableVehicles: 12,
    conditions: {
      securityDeposit: 200000,
      distanceLimitKm: 50,
      overtimeFeePerHour: 90000,
      overDistanceFeePerKm: 5000,
    },
    highlights: ["Thông thạo đường nội thành", "Hỗ trợ hành lý"],
  },
  {
    packageId: "pkg_combo_4h",
    packageName: "Gói 4 giờ - Xe kèm tài xế",
    serviceType: "RENTAL_CAR_WITH_DRIVER",
    vehicleTypeName: "SUV",
    driverLevel: "Chuyên nghiệp",
    basePrice: 680000,
    totalEstimatedPrice: 680000,
    currency: "VND",
    availableVehicles: 4,
    conditions: {
      securityDeposit: 500000,
      distanceLimitKm: 70,
      overtimeFeePerHour: 150000,
      overDistanceFeePerKm: 7000,
    },
    highlights: ["Phù hợp đi công tác", "Tài xế được đào tạo bài bản"],
  },
];

function calcPrice(basePrice: number, durationHours: number, couponCode?: string) {
  const durationFee = durationHours > 4 ? (durationHours - 4) * 70000 : 0;
  const serviceFee = 25000;
  const subTotal = basePrice + durationFee + serviceFee;
  let discount = 0;
  if (couponCode?.toUpperCase() === "RENTAL50") {
    discount = Math.min(50000, subTotal);
  }
  return { durationFee, serviceFee, discount, total: subTotal - discount };
}

export const rentalFlowService = {
  searchPackages: async (criteria: RentalSearchCriteria): Promise<RentalPackageListResponse> => {
    if (USE_MOCK_RENTAL) {
      await mockDelay(450);

      if (criteria.pickupAddress.toLowerCase().includes("offline")) {
        throwError("NETWORK_ERROR", "Không có kết nối mạng", 0);
      }

      const filtered = basePackages
        .filter((item) => item.serviceType === criteria.serviceType)
        .map((item) => ({
          ...item,
          totalEstimatedPrice: item.basePrice + Math.max(0, criteria.durationHours - 4) * 70000,
        }));

      if (criteria.pickupAddress.toLowerCase().includes("nopackage") || filtered.length === 0) {
        return {
          criteria,
          packages: [],
          suggestions: [
            "Thu đổi khung giờ khởi hành",
            "Thu dịch vụ khác (thuê tài xế / thuê xe)",
            "Mở rộng khu vực điểm đón",
          ],
        };
      }

      return {
        criteria,
        packages: filtered,
        suggestions: [],
      };
    }

    const response = await apiClient.post<RentalPackageListResponse>("/rentals/packages/search", criteria);
    return response.data;
  },

  estimatePricing: async (payload: RentalPricingRequest): Promise<RentalPricingResponse> => {
    if (USE_MOCK_RENTAL) {
      await mockDelay(300);

      const found = basePackages.find((item) => item.packageId === payload.packageId);
      if (!found) {
        throwError("RENTAL_PRICING_ERROR", "Không tìm thấy gói thuê", 404);
      }

      const pricing = calcPrice(found.basePrice, payload.criteria.durationHours, payload.couponCode);
      return {
        packageId: payload.packageId,
        basePrice: found.basePrice,
        durationFee: pricing.durationFee,
        serviceFee: pricing.serviceFee,
        discount: pricing.discount,
        deposit: found.conditions.securityDeposit,
        totalPayableNow: pricing.total,
        currency: "VND",
      };
    }

    const response = await apiClient.post<RentalPricingResponse>("/rentals/pricing/estimate", payload);
    return response.data;
  },

  createRentalBooking: async (payload: CreateRentalBookingRequest): Promise<CreateRentalBookingResponse> => {
    if (USE_MOCK_RENTAL) {
      await mockDelay(550);

      if (payload.pickupAddress.toLowerCase().includes("booking-error")) {
        throwError("RENTAL_BOOKING_ERROR", "Tạo rental booking thất bại", 500);
      }

      const status = payload.startAt > new Date().toISOString() ? "SCHEDULED" : "PENDING";
      return {
        bookingId: `booking_rental_${Date.now()}`,
        rentalBookingId: `rental_${Date.now()}`,
        bookingStatus: status,
        message: status === "SCHEDULED" ? "Đặt lịch thuê thành công" : "Yêu cầu thuê đang được xử lý",
      };
    }

    const response = await apiClient.post<CreateRentalBookingResponse>("/rental_bookings", payload);
    return response.data;
  },
};
