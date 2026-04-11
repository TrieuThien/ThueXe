import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    getRideChatMessagesHandler,
    pollRideChatMessagesHandler,
    sendRideChatMessageHandler,
} from "../../controllers/customer/chatController.js";
import {
    getRideChatMessagesValidator,
    pollRideChatMessagesValidator,
    sendRideChatMessageValidator,
} from "../../validators/customer/chatValidators.js";

const router = Router();

router.get(
    "/booking/:bookingId",
    requireAuth,
    getRideChatMessagesValidator,
    validateRequest,
    getRideChatMessagesHandler
);

router.post(
    "/booking/:bookingId",
    requireAuth,
    sendRideChatMessageValidator,
    validateRequest,
    sendRideChatMessageHandler
);

router.get(
    "/booking/:bookingId/poll",
    requireAuth,
    pollRideChatMessagesValidator,
    validateRequest,
    pollRideChatMessagesHandler
);

export default router;
