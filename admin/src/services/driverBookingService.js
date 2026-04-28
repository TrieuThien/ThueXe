import { apiClient } from "./authService";

function payload(response) {
    return response?.data?.data || response?.data || {};
}

/** Danh sách booking thuê tài xế (service_type=2,3) */
export async function listDriverBookings(params = {}) {
    const response = await apiClient.get("/api/rentals/bookings", {
        params: { ...params, service_type: 2 },
    });
    return payload(response);
}

/** Chi tiết một booking thuê tài xế */
export async function getDriverBookingDetail(rentalId) {
    const response = await apiClient.get(`/api/rentals/bookings/${rentalId}`);
    return payload(response).booking || null;
}

/** Cập nhật trạng thái booking (admin) */
export async function updateDriverBookingStatus(rentalId, status) {
    const response = await apiClient.patch(`/api/rentals/bookings/${rentalId}/status`, { status });
    return payload(response);
}

/** Gán tài xế thủ công vào booking */
export async function assignDriverToBooking(rentalId, driverId) {
    const response = await apiClient.patch(`/api/rentals/bookings/${rentalId}/assign`, { driver_id: driverId });
    return payload(response);
}
