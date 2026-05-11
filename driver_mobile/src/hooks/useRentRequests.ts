import { useState, useEffect, useCallback } from 'react';
import { driverSseClient } from '../services/realtime/driverSseClient';
import type { RentRequest } from '../screens/rental/RequestModal';

export function useRentRequests(accessToken: string | null) {
  const [rentRequest, setRentRequest] = useState<RentRequest | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const unsub = driverSseClient.on('NEW_DRIVER_RENT_REQUEST', (payload: RentRequest) => {
      setRentRequest(payload);
    });
    return () => { unsub(); };
  }, [accessToken]);

  const dismissRentRequest = useCallback(() => setRentRequest(null), []);
  return { rentRequest, dismissRentRequest };
}
