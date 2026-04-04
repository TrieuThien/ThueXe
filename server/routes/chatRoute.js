import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    getBookingChatsHandler,
    listSupportChatsHandler,
    sendBookingChatHandler,
    sendSupportChatHandler,
} from "../controllers/chatController.js";
import {
    bookingChatListValidator,
    sendBookingChatValidator,
    sendSupportChatValidator,
    supportChatListValidator,
} from "../validators/chatValidators.js";

const router = Router();

router.get(
    "/api/chats/bookings/:bookingId",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    bookingChatListValidator,
    validateRequest,
    getBookingChatsHandler
);
router.post(
    "/api/chats/bookings/:bookingId",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    sendBookingChatValidator,
    validateRequest,
    sendBookingChatHandler
);

router.get(
    "/api/chats/support",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    supportChatListValidator,
    validateRequest,
    listSupportChatsHandler
);
router.post(
    "/api/chats/support",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    sendSupportChatValidator,
    validateRequest,
    sendSupportChatHandler
);

export default router;

