/**
 * driverSseClient.ts
 *
 * Server-Sent Events client for the driver app.
 * Subscribes to /api/driver/realtime and dispatches typed events.
 *
 * Usage:
 *   driverSseClient.connect(accessToken);
 *   const unsub = driverSseClient.on('NEW_RIDE_REQUEST', handler);
 *   driverSseClient.disconnect();
 */

import { API_BASE_URL } from '../../constants/app';

type EventHandler = (payload: any) => void;

class DriverSseClient {
  private abortController: AbortController | null = null;
  private listeners = new Map<string, Set<EventHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;

  /** Open the SSE connection. Call after login / on app foreground. */
  connect(accessToken: string) {
    this.token = accessToken;
    this._open();
  }

  /** Close the SSE connection. Call on logout / app background. */
  disconnect() {
    this.token = null;
    this._close();
  }

  /** Subscribe to a named SSE event. Returns an unsubscribe function. */
  on(eventName: string, handler: EventHandler): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler);
    return () => this.listeners.get(eventName)?.delete(handler);
  }

  private _open() {
    this._close();
    if (!this.token) return;

    // React Native does not support native EventSource — use a fetch-based polyfill
    // or a plain fetch with ReadableStream. Here we use a lightweight fetch loop.
    this._fetchLoop();
  }

  private _close() {
    this.abortController?.abort();
    this.abortController = null;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async _fetchLoop() {
    if (!this.token) return;

    this.abortController = new AbortController();

    try {
      const url = `${API_BASE_URL}/api/driver/realtime`;
      const response = await fetch(url, {
        signal: this.abortController.signal,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE connect failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const chunk of parts) {
          this._parseChunk(chunk);
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // Intentionally closed — do not reconnect
    }

    if (this.token) {
      this.reconnectTimer = setTimeout(() => this._fetchLoop(), 3000);
    }
  }

  private _parseChunk(chunk: string) {
    let eventName = 'message';
    let dataLine = '';

    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLine = line.slice(5).trim();
      }
    }

    if (!dataLine) return;

    let payload: any;
    try {
      payload = JSON.parse(dataLine);
    } catch {
      payload = dataLine;
    }

    const handlers = this.listeners.get(eventName);
    if (handlers) {
      for (const h of handlers) {
        h(payload);
      }
    }
  }
}

export const driverSseClient = new DriverSseClient();
