export type RealtimeEvent =
  | { type: 'new_trip'; payload: { tripId: string } }
  | { type: 'notification'; payload: { notificationId: string } };

type Listener = (event: RealtimeEvent) => void;

class MockRealtimeClient {
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  connect() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.listeners.forEach((listener) => {
        listener({
          type: 'notification',
          payload: { notificationId: `noti-${Date.now()}` }
        });
      });
    }, 25000);
  }

  disconnect() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const realtimeClient = new MockRealtimeClient();
