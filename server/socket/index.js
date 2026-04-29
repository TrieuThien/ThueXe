/**
 * socket/index.js
 *
 * Socket.io server setup cho realtime driver matching.
 *
 * CÁCH ENABLE:
 *  1. npm install socket.io
 *  2. Trong index.mjs: bỏ comment các dòng http/socket
 *  3. Server sẽ tự dùng module này
 *
 * EVENTS DRIVER LISTEN:
 *   NEW_DRIVER_RENT_REQUEST  - yêu cầu thuê tài xế mới
 *   BOOKING_CANCELLED        - khách hủy khi đang tìm
 *
 * EVENTS CUSTOMER LISTEN:
 *   SEARCHING_DRIVER         - đang tìm tài xế
 *   DRIVER_ACCEPTED          - tài xế đã nhận
 *   DRIVER_NOT_FOUND         - không tìm được tài xế
 *
 * EVENTS DRIVER EMIT:
 *   DRIVER_ACCEPT_REQUEST    - tài xế chấp nhận
 *   DRIVER_REJECT_REQUEST    - tài xế từ chối
 */

import { Server } from "socket.io";
import jwt from "jsonwebtoken";

/** Map: userId → Set<socketId> (một user có thể mở nhiều tab/thiết bị) */
const userSockets = new Map();
/** Map: driverId → Set<socketId> */
const driverSockets = new Map();

let io = null;

/**
 * Khởi tạo Socket.io server, gắn vào HTTP server.
 * @param {import('http').Server} httpServer
 */
export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: (process.env.CORS_ORIGINS || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .concat([
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "http://localhost:5174",
                ]),
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Authenticate mỗi connection
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
        if (!token) return next(new Error("No token"));
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.data.userId   = Number(payload.userId);
            socket.data.role     = payload.role;
            socket.data.userType = payload.userType;
            next();
        } catch {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        const { userId, role } = socket.data;

        if (role === "driver") {
            if (!driverSockets.has(userId)) driverSockets.set(userId, new Set());
            driverSockets.get(userId).add(socket.id);
        } else {
            if (!userSockets.has(userId)) userSockets.set(userId, new Set());
            userSockets.get(userId).add(socket.id);
        }

        socket.on("disconnect", () => {
            if (role === "driver") {
                driverSockets.get(userId)?.delete(socket.id);
                if (driverSockets.get(userId)?.size === 0) driverSockets.delete(userId);
            } else {
                userSockets.get(userId)?.delete(socket.id);
                if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
            }
        });

        // Tài xế phản hồi yêu cầu
        socket.on("DRIVER_ACCEPT_REQUEST", (data) => {
            socket.to(`booking_${data.bookingId}`).emit("DRIVER_RESPONSE", {
                bookingId: data.bookingId,
                driverId:  userId,
                action:    "accepted",
            });
        });

        socket.on("DRIVER_REJECT_REQUEST", (data) => {
            socket.to(`booking_${data.bookingId}`).emit("DRIVER_RESPONSE", {
                bookingId: data.bookingId,
                driverId:  userId,
                action:    "rejected",
            });
        });
    });

    console.log("[Socket.io] Server initialized");
    return io;
}

/**
 * Gửi event đến tất cả socket của một tài xế.
 * @param {number} driverId
 * @param {string} event
 * @param {object} payload
 */
export function emitToDriver(driverId, event, payload) {
    if (!io) return;
    const sids = driverSockets.get(Number(driverId));
    if (!sids) return;
    for (const sid of sids) {
        io.to(sid).emit(event, payload);
    }
}

/**
 * Gửi event đến tất cả socket của một customer.
 * @param {number} userId
 * @param {string} event
 * @param {object} payload
 */
export function emitToUser(userId, event, payload) {
    if (!io) return;
    const sids = userSockets.get(Number(userId));
    if (!sids) return;
    for (const sid of sids) {
        io.to(sid).emit(event, payload);
    }
}

/** Kiểm tra tài xế có đang kết nối socket không. */
export function isDriverOnline(driverId) {
    return (driverSockets.get(Number(driverId))?.size ?? 0) > 0;
}

/** Trả về instance io (null nếu chưa init). */
export function getIO() {
    return io;
}
