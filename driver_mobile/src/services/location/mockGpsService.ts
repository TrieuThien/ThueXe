import type { LocationError, LocationPermissionStatus, DriverLocation, GpsStatus } from '../../types/working';

class MockGpsService {
  private permission: LocationPermissionStatus = 'denied';
  private gpsStatus: GpsStatus = 'ready';

  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    return this.permission;
  }

  async requestPermission(): Promise<LocationPermissionStatus> {
    this.permission = 'granted';
    return this.permission;
  }

  async getGpsStatus(): Promise<GpsStatus> {
    return this.gpsStatus;
  }

  async getCurrentPosition(): Promise<DriverLocation> {
    if (this.permission !== 'granted') {
      throw {
        code: 'LOCATION_PERMISSION_DENIED',
        message: 'Chưa cấp quyền vị trí'
      } as LocationError;
    }

    if (this.gpsStatus === 'disabled') {
      throw {
        code: 'GPS_DISABLED',
        message: 'GPS dang tat'
      } as LocationError;
    }

    if (this.gpsStatus === 'error') {
      throw {
        code: 'GPS_ERROR',
        message: 'Khong lay duoc GPS'
      } as LocationError;
    }

    return {
      lat: 10.7769 + Math.random() * 0.01,
      lng: 106.7009 + Math.random() * 0.01,
      updatedAt: new Date().toISOString()
    };
  }
}

export const mockGpsService = new MockGpsService();
