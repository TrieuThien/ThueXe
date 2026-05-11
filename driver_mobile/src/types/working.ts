export type ServiceTypeId = 'goi_xe' | 'thue_tai_xe' | 'xe_kem_tai_xe' ;

export type NetworkStatus = 'online' | 'offline';
export type GpsStatus = 'ready' | 'disabled' | 'error';
export type LocationPermissionStatus = 'granted' | 'denied';

export type DriverLocation = {
  lat: number;
  lng: number;
  updatedAt: string;
};

export type ServiceTypeOption = {
  id: ServiceTypeId;
  label: string;
};

export type WorkingOverview = {
  isOnline: boolean;
  operationZone: string;
  gpsStatus: GpsStatus;
  permissionStatus: LocationPermissionStatus;
  networkStatus: NetworkStatus;
  workingStatusLabel: string;
  activeServiceTypes: ServiceTypeId[];
  lastLocation: DriverLocation | null;
  autoUpdating: boolean;
};

export type UpdateServiceTypesPayload = {
  serviceTypes: ServiceTypeId[];
};

export type ManualLocationUpdatePayload = {
  lat: number;
  lng: number;
};

export type LocationErrorCode =
  | 'LOCATION_PERMISSION_DENIED'
  | 'GPS_DISABLED'
  | 'GPS_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export type LocationError = {
  code: LocationErrorCode;
  message: string;
};

