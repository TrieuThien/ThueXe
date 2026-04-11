import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
    getRentalChatMessagesHandler,
    pollRentalChatMessagesHandler,
    sendRentalChatMessageHandler,
} from "../../controllers/customer/chatController.js";
import {
    getRentalChatMessagesValidator,
    pollRentalChatMessagesValidator,
    sendRentalChatMessageValidator,
} from "../../validators/customer/chatValidators.js";

const router = Router();

router.get(
    "/:rentalId",
    requireAuth,
    getRentalChatMessagesValidator,
    validateRequest,
    getRentalChatMessagesHandler
);

router.post(
    "/:rentalId",
    requireAuth,
    sendRentalChatMessageValidator,
    validateRequest,
    sendRentalChatMessageHandler
);

router.get(
    "/:rentalId/poll",
    requireAuth,
    pollRentalChatMessagesValidator,
    validateRequest,
    pollRentalChatMessagesHandler
);

export default router;
