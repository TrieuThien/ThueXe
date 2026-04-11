function deriveWsBaseUrl() {
    const explicit = import.meta.env.VITE_WS_BASE_URL?.trim();
    if (explicit) {
        return explicit.replace(/\/+$/, "");
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
    if (!apiBase) {
        return "";
    }

    return apiBase
        .replace(/^http:\/\//i, "ws://")
        .replace(/^https:\/\//i, "wss://")
        .replace(/\/+$/, "");
}

export function connectRealtime(path, { onMessage, onOpen, onClose, onError } = {}) {
    const wsBase = deriveWsBaseUrl();
    if (!wsBase) {
        return { close: () => {} };
    }

    const socket = new WebSocket(`${wsBase}${path}`);

    socket.onopen = () => onOpen?.();
    socket.onclose = () => onClose?.();
    socket.onerror = (event) => onError?.(event);
    socket.onmessage = (event) => {
        try {
            const parsed = JSON.parse(event.data);
            onMessage?.(parsed);
        } catch {
            onMessage?.(event.data);
        }
    };

    return {
        socket,
        send: (payload) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
            }
        },
        close: () => {
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
        },
    };
}
