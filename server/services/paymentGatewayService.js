import { findPaymentByCode, findSepayPendingPaymentByContent } from "../repositories/customer/walletRepository.js";
import { mapSepayIpnStatus, createSepayPayment, buildSepayFormHtml } from "./payment/sepayService.js";
import { verifyMomoIpnSignature, mapMomoResultCode } from "./payment/momoService.js";
import { webhookConfirmPayment } from "./customer/walletService.js";
import { confirmOwnerGatewayTopup, processOwnerMomoTopupIpn } from "./ownerService.js";
import AppError from "../utils/appError.js";

async function dispatchConfirmByActor(payment, status, gatewayFields = {}) {
    const actorType = Number(payment.actor_type);
    if (actorType === 0) {
        await webhookConfirmPayment({
            payment_id: Number(payment.payment_id),
            status,
            gateway_status: status,
            gateway_name: payment.gateway_name || "sepay",
            ...gatewayFields,
            currency: "VND",
        });
    } else if (actorType === 2) {
        await confirmOwnerGatewayTopup(payment, status);
    }
}

export async function handleSepayIpn(body) {
    const code    = body.code    ? String(body.code).trim()    : null;
    const content = body.content ? String(body.content).trim() : null;

    let payment = null;
    if (code) payment = await findPaymentByCode(code);
    if (!payment && content) payment = await findSepayPendingPaymentByContent(content);
    if (!payment) return { success: true };

    const status = mapSepayIpnStatus(body);
    await dispatchConfirmByActor(payment, status, {
        gateway_transaction_ref: body.id != null ? String(body.id) : null,
        p_transaction_ref: body.referenceCode != null ? String(body.referenceCode) : null,
        gateway_resp: body.content || null,
    });

    return { success: true };
}

export async function getSepayCheckoutHtml(paymentCode) {
    const payment = await findPaymentByCode(paymentCode);
    if (!payment) throw new AppError("Payment not found.", 404, "PAYMENT_NOT_FOUND");

    const baseSuccessUrl = (process.env.SEPAY_SUCCESS_URL || "").split("?")[0];
    const { fields } = createSepayPayment({
        paymentCode,
        amount: Number(payment.amount),
        orderInfo: payment.description || "Thanh toán ThueXe",
        successUrl: baseSuccessUrl ? `${baseSuccessUrl}?code=${paymentCode}` : undefined,
        errorUrl: process.env.SEPAY_ERROR_URL,
        cancelUrl: process.env.SEPAY_CANCEL_URL,
    });

    return buildSepayFormHtml(fields);
}

export async function handleMomoIpn(body) {
    const isValid = verifyMomoIpnSignature(body);
    if (!isValid) {
        throw new AppError("Invalid MoMo signature.", 400, "INVALID_MOMO_SIGNATURE");
    }

    const payment = await findPaymentByCode(body.orderId);
    if (!payment) return { resultCode: 0, message: "ok" };

    const status = mapMomoResultCode(body.resultCode);
    const actorType = Number(payment.actor_type);

    if (actorType === 0) {
        await webhookConfirmPayment({
            payment_id: Number(payment.payment_id),
            status,
            gateway_status: status,
            gateway_name: "momo",
            gateway_transaction_ref: body.transId != null ? String(body.transId) : null,
            p_transaction_ref: body.transId != null ? String(body.transId) : null,
            gateway_resp: body.message || null,
            currency: "VND",
        });
    } else if (actorType === 2) {
        await processOwnerMomoTopupIpn({
            orderId: body.orderId,
            resultCode: body.resultCode,
            transId: body.transId,
            message: body.message,
        });
    }

    return { resultCode: 0, message: "ok" };
}

export async function confirmPaymentByCode(code) {
    if (!code || process.env.SEPAY_ENV !== "sandbox") return;

    const payment = await findPaymentByCode(code);
    if (!payment || String(payment.status).toLowerCase() !== "pending") return;

    await dispatchConfirmByActor(payment, "paid", {
        gateway_transaction_ref: null,
        p_transaction_ref: null,
        gateway_resp: "sandbox_redirect_confirm",
    });
}
