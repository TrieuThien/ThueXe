import { Router } from "express";
import { paymentResultHandler } from "../controllers/paymentResultController.js";

const router = Router();

router.get("/payment-result", paymentResultHandler);

export default router;
