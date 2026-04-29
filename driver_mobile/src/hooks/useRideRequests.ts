/**
 * useRideRequests.ts
 *
 * Connects to the driver SSE stream and surfaces incoming ride-dispatch requests.
 * Manages the RideRequest state consumed by <RideRequestModal>.
 *
 * Usage:
 *   const { rideRequest, dismissRideRequest } = useRideRequests(accessToken);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { driverSseClient } from '../services/realtime/driverSseClient';
import type { RideRequest } from '../screens/booking/RideRequestModal';

export function useRideRequests(accessToken: string | null) {
  const [rideRequest, setRideRequest] = useState<RideRequest | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!accessToken) {
      driverSseClient.disconnect();
      connectedRef.current = false;
      return;
    }

    if (!connectedRef.current) {
      driverSseClient.connect(accessToken);
      connectedRef.current = true;
    }

    const unsub = driverSseClient.on('NEW_RIDE_REQUEST', (payload: RideRequest) => {
      setRideRequest(payload);
    });

    return () => {
      unsub();
    };
  }, [accessToken]);

  const dismissRideRequest = useCallback(() => {
    setRideRequest(null);
  }, []);

  return { rideRequest, dismissRideRequest };
}
