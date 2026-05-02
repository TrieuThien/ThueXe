import crypto from "crypto";
import AppError from "../../utils/appError.js";

const MERCHANT_ID = process.env.SEPAY_MERCHANT_ID || "";
const SECRET_KEY = process.env.SEPAY_SECRET_KEY || "";

// SePay checkout requires a form POST — these are the browser-facing endpoints
// Sandbox:    https://pay-sandbox.sepay.vn/v1/checkout/init
// Production: https://pay.sepay.vn/v1/checkout/init
const CHECKOUT_FORM_URL = process.env.SEPAY_ENV === "production"
    ? "https://pay.sepay.vn/v1/checkout/init"
    : "https://pay-sandbox.sepay.vn/v1/checkout/init";

// Thứ tự field cho chữ ký — lấy từ source code SDK sepayvn/sepay-pg-node/checkout.ts
const SIGN_FIELD_ORDER = [
    "merchant", "env", "operation", "payment_method",
    "order_amount", "currency", "order_invoice_number", "order_description",
    "customer_id", "agreement_id", "agreement_name", "agreement_type",
    "agreement_payment_frequency", "agreement_amount_per_payment",
    "success_url", "error_url", "cancel_url", "order_id",
];

function buildSignature(fields) {
    const signed = SIGN_FIELD_ORDER
        .filter((key) => fields[key] !== undefined && fields[key] !== null)
        .map((key) => `${key}=${fields[key] ?? ""}`)
        .join(",");

    return crypto.createHmac("sha256", SECRET_KEY).update(signed).digest("base64");
}

/**
 * Tạo signed fields cho SePay checkout (form POST).
 * Trả về object chứa tất cả fields đã ký, dùng để render HTML form.
 */
export function createSepayPayment({ paymentCode, amount, orderInfo, successUrl, errorUrl, cancelUrl }) {
    if (!MERCHANT_ID || !SECRET_KEY) {
        throw new AppError("SePay credentials not configured.", 500, "SEPAY_NOT_CONFIGURED");
    }

    const amountInt = Math.round(Number(amount));

    const fields = {
        merchant: MERCHANT_ID,
        operation: "PURCHASE",
        order_amount: amountInt,
        currency: "VND",
        order_invoice_number: paymentCode,
        order_description: orderInfo,
    };

    if (successUrl) fields.success_url = successUrl;
    if (errorUrl) fields.error_url = errorUrl;
    if (cancelUrl) fields.cancel_url = cancelUrl;

    fields.signature = buildSignature(fields);

    return { fields, invoiceNumber: paymentCode };
}

/**
 * Tạo HTML trang relay tự động submit form POST đến SePay.
 * Dùng khi mobile/browser cần chuyển đến trang thanh toán SePay.
 */
export function buildSepayFormHtml(fields) {
    const escapeHtml = (s) => String(s)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const inputs = Object.entries(fields)
        .map(([k, v]) => `    <input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`)
        .join("\n");

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Đang chuyển đến SePay...</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; background: #f8fafc; }
    .card { text-align: center; padding: 32px; background: #fff; border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #3b82f6;
               border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <p style="color:#334155;margin:0">Đang chuyển đến trang thanh toán SePay...</p>
  </div>
  <form id="f" method="POST" action="${escapeHtml(CHECKOUT_FORM_URL)}" style="display:none">
${inputs}
  </form>
  <script>window.onload = function() { document.getElementById('f').submit(); };</script>
</body>
</html>`;
}

/**
 * Map trạng thái IPN webhook của SePay sang trạng thái nội bộ.
 * SePay gửi transferType "in" khi khách đã chuyển tiền thành công.
 */
export function mapSepayIpnStatus(ipnPayload) {
    const transferType = String(ipnPayload?.transferType || "").toLowerCase();
    if (transferType === "in") return "paid";
    return "failed";
}
