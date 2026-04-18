import apiClient from './apiClient';

const unwrap = (response) => response.data?.data ?? response.data;

export const rentalPackageService = {
  /** Danh sách gói thuê xe đang active (service_type=1) */
  async listVehicleRentalPackages() {
    const response = await apiClient.get('/rental-packages');
    return unwrap(response);
  },

  /** Gói thuê đã được gán cho xe */
  async getVehiclePackages(vehicleId) {
    const response = await apiClient.get(`/vehicle-management/vehicles/${vehicleId}/rental-packages`);
    return unwrap(response);
  },

  /** Gán (thay thế) danh sách gói thuê cho xe */
  async setVehiclePackages(vehicleId, packageIds) {
    const response = await apiClient.put(
      `/vehicle-management/vehicles/${vehicleId}/rental-packages`,
      { package_ids: packageIds }
    );
    return unwrap(response);
  },
};
