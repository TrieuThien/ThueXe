import { useEffect, useRef } from 'react';

const SSE_BASE = (import.meta.env.VITE_OWNER_API_URL || 'http://localhost:8000/api/owner');

/**
 * Kết nối SSE tới /api/owner/realtime và gọi handler tương ứng khi nhận event.
 * @param {Record<string, (payload: unknown) => void>} handlers - map event → callback
 */
export function useOwnerRealtime(handlers) {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        const token = localStorage.getItem('owner_access_token');
        if (!token) return;

        const eventNames = Object.keys(handlersRef.current);
        const params = new URLSearchParams({ token });
        if (eventNames.length > 0) params.set('events', eventNames.join(','));

        const es = new EventSource(`${SSE_BASE}/realtime?${params}`);

        for (const eventName of eventNames) {
            es.addEventListener(eventName, (event) => {
                try {
                    handlersRef.current[eventName]?.(JSON.parse(event.data ?? '{}'));
                } catch {
                    handlersRef.current[eventName]?.({});
                }
            });
        }

        return () => es.close();
        // Intentionally empty deps: connect once on mount, reconnect if token/events change
        // is not needed — EventSource auto-reconnects on drop.
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
