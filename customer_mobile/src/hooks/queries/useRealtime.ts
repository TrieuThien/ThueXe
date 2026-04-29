import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { APP_CONFIG, QUERY_KEY_FACTORY } from "../../constants";
import { realtimeApi } from "../../services";
import { useAuthStore } from "../../store";

type RealtimeEventName = (typeof APP_CONFIG.realtimeEvents)[number];

type RealtimeHandlerMap = Partial<Record<RealtimeEventName, (payload: unknown) => void>>;

interface UseRealtimeOptions {
  bookingId?: string | number;
  events?: RealtimeEventName[];
  fallbackIntervalMs?: number;
  handlers?: RealtimeHandlerMap;
}

export function useRealtime({
  bookingId,
  events = [...APP_CONFIG.realtimeEvents],
  fallbackIntervalMs = 8000,
  handlers,
}: UseRealtimeOptions = {}) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const eventSourceRef = useRef<{ close: () => void } | null>(null);

  const fallbackHandlers = useMemo<RealtimeHandlerMap>(
    () => ({
      "booking.status.updated": () => {
        if (!bookingId) return;
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.bookings.detail(bookingId) });
      },
      "driver.location.updated": () => {
        if (!bookingId) return;
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.bookings.tracking(bookingId) });
      },
      "chat.message.created": () => {
        if (!bookingId) return;
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.chats.booking(bookingId) });
      },
      "payment.updated": () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.wallet.overview() });
      },
      "wallet.updated": () => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.wallet.overview() }),
          queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] }),
        ]);
      },
      // Ride dispatch events — invalidate driver allocation status so UI updates instantly
      "RIDE_DRIVER_ACCEPTED": () => {
        if (!bookingId) return;
        void queryClient.invalidateQueries({ queryKey: ["rideFlow", "driverAllocation", bookingId] });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.bookings.detail(bookingId) });
      },
      "RIDE_NO_DRIVER_FOUND": () => {
        if (!bookingId) return;
        void queryClient.invalidateQueries({ queryKey: ["rideFlow", "driverAllocation", bookingId] });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.bookings.detail(bookingId) });
      },
      "RIDE_DRIVER_SEARCHING": () => {
        if (!bookingId) return;
        void queryClient.invalidateQueries({ queryKey: ["rideFlow", "driverAllocation", bookingId] });
      },
      ...handlers,
    }),
    [bookingId, handlers, queryClient],
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let hasConnected = false;

    const connectSse = () => {
      try {
        const EventSourceCtor = (globalThis as { EventSource?: unknown }).EventSource as
          | (new (url: string, init?: unknown) => { close: () => void; addEventListener: (name: string, cb: (event: { data?: string }) => void) => void })
          | undefined;
        if (!EventSourceCtor) {
          throw new Error("SSE_NOT_SUPPORTED");
        }

        const source = new EventSourceCtor(realtimeApi.streamUrl(events), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        eventSourceRef.current = source;
        hasConnected = true;

        events.forEach((eventName) => {
          source.addEventListener(eventName, (event) => {
            try {
              const payload = JSON.parse(event.data ?? "{}");
              fallbackHandlers[eventName]?.(payload);
            } catch {
              fallbackHandlers[eventName]?.({});
            }
          });
        });

        source.addEventListener("error", () => {
          if (!fallbackTimer) {
            fallbackTimer = setInterval(async () => {
              if (!bookingId) return;
              await Promise.all([
                realtimeApi.getBookingStatusFallback(bookingId),
                realtimeApi.getDriverLocationFallback(bookingId),
              ]);
              fallbackHandlers["booking.status.updated"]?.({});
              fallbackHandlers["driver.location.updated"]?.({});
            }, fallbackIntervalMs);
          }
        });
      } catch {
        fallbackTimer = setInterval(async () => {
          if (!bookingId) return;
          await Promise.all([
            realtimeApi.getBookingStatusFallback(bookingId),
            realtimeApi.getDriverLocationFallback(bookingId),
          ]);
          fallbackHandlers["booking.status.updated"]?.({});
          fallbackHandlers["driver.location.updated"]?.({});
        }, fallbackIntervalMs);
      }
    };

    connectSse();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
      }
      if (!hasConnected && bookingId) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY_FACTORY.bookings.detail(bookingId) });
      }
    };
  }, [accessToken, bookingId, events, fallbackHandlers, fallbackIntervalMs, queryClient]);
}
