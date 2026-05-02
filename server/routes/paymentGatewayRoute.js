import { Router } from "express";
import validateRequest from "../middlewares/validateRequest.js";
import { momoIpnGatewayHandler, sepayIpnGatewayHandler, sepayCheckoutGatewayHandler } from "../controllers/paymentGatewayController.js";
import { momoIpnValidator, sepayIpnValidator } from "../validators/paymentGatewayValidators.js";

const router = Router();

// MoMo IPN webhook — server-to-server callback, shared across customer/owner
router.post("/api/payments/webhook/momo", momoIpnValidator, validateRequest, momoIpnGatewayHandler);

// SePay checkout relay — browser/WebView opens this URL, receives HTML that auto-POSTs to SePay
router.get("/api/payments/checkout/sepay", sepayCheckoutGatewayHandler);

// SePay IPN webhook — server-to-server callback, shared across customer/owner/driver
router.post("/api/payments/webhook/sepay", sepayIpnValidator, validateRequest, sepayIpnGatewayHandler);

export default router;
