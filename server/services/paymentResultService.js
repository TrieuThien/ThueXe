import { findPaymentByCode } from "../repositories/customer/walletRepository.js";
import { webhookConfirmPayment } from "./customer/walletService.js";

/**
 * Trong môi trường sandbox, xác nhận thanh toán ngay khi gateway redirect về
 * success_url (thay cho IPN chưa gọi về). Idempotent: bỏ qua nếu đã paid.
 */
export async function confirmSandboxPaymentOnRedirect(code) {
    if (!code || process.env.SEPAY_ENV !== "sandbox") return;

    const payment = await findPaymentByCode(code);
    if (!payment || String(payment.status).toLowerCase() !== "pending") return;

    await webhookConfirmPayment({
        payment_id: Number(payment.payment_id),
        status: "paid",
        gateway_status: "paid",
        gateway_name: payment.gateway_name || "sepay",
        gateway_transaction_ref: null,
        p_transaction_ref: null,
        gateway_resp: "sandbox_redirect_confirm",
        currency: "VND",
    });
}
