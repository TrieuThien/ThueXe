export type RealtimeEvent =
  | { type: 'new_trip'; payload: { tripId: string } }
  | { type: 'notification'; payload: { notificationId: string } };

type Listener = (event: RealtimeEvent) => void;

// No-op realtime client — real-time events are handled via polling in useDriverQueries
class NoopRealtimeClient {
  private listeners = new Set<Listener>();

  connect() {}

  disconnect() {}

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const realtimeClient = new NoopRealtimeClient();
