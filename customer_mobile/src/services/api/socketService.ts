import { io, Socket } from "socket.io-client";
import { APP_CONFIG } from "../../constants";
import { useAuthStore } from "../../store";

let socket: Socket | null = null;

/**
 * Initialize socket connection
 */
export function initSocketConnection() {
    if (socket?.connected) {
        return socket;
    }

    const token = useAuthStore.getState().accessToken;
    if (!token) {
        console.warn("[Socket] No auth token available, skipping socket connection");
        return null;
    }

    socket = io(APP_CONFIG.apiBaseUrl, {
        auth: {
            token,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
        console.log("[Socket] Connected:", socket?.id);
    });

    socket.on("disconnect", () => {
        console.log("[Socket] Disconnected");
    });

    socket.on("connect_error", (error) => {
        console.error("[Socket] Connection error:", error);
    });

    return socket;
}

/**
 * Get socket instance (initialize if needed)
 */
export function getSocket(): Socket | null {
    if (!socket) {
        return initSocketConnection();
    }
    return socket;
}

/**
 * Socket service for event listening and emitting
 */
export const socketService = {
    /**
     * Listen for socket events
     */
    on: (event: string, callback: (data: any) => void) => {
        const sock = getSocket();
        if (sock) {
            sock.on(event, callback);
        }
    },

    /**
     * Stop listening for socket events
     */
    off: (event: string, callback?: (data: any) => void) => {
        const sock = getSocket();
        if (sock) {
            if (callback) {
                sock.off(event, callback);
            } else {
                sock.off(event);
            }
        }
    },

    /**
     * Emit socket event
     */
    emit: (event: string, data?: any) => {
        const sock = getSocket();
        if (sock) {
            sock.emit(event, data);
        }
    },

    /**
     * Check if socket is connected
     */
    isConnected: () => {
        return socket?.connected ?? false;
    },

    /**
     * Disconnect socket
     */
    disconnect: () => {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    },

    /**
     * Reconnect socket
     */
    reconnect: () => {
        if (socket) {
            socket.connect();
        } else {
            initSocketConnection();
        }
    },
};
