import crypto from "crypto";
import https from "https";
import AppError from "../../utils/appError.js";

const PARTNER_CODE = process.env.MOMO_PARTNER_CODE || "MOMO";
const ACCESS_KEY = process.env.MOMO_ACCESS_KEY || "";
const SECRET_KEY = process.env.MOMO_SECRET_KEY || "";
const API_URL = process.env.MOMO_API_URL || "https://test-payment.momo.vn";

// POST JSON to MoMo HTTPS endpoint
function postJson(hostname, path, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const options = {
            hostname,
            port: 443,
            path,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
            },
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve({ resultCode: -1, message: "Invalid JSON response", raw: data });
                }
            });
        });

        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

/**
 * Tạo giao dịch thanh toán MoMo (captureWallet).
 * @param {object} params
 * @param {string} params.paymentCode  - payment_code từ bảng payments, dùng làm orderId
 * @param {number} params.amount       - Số tiền (VND, số nguyên)
 * @param {string} params.orderInfo    - Mô tả đơn hàng
 * @param {string} params.ipnUrl       - URL nhận IPN callback từ MoMo (server-to-server)
 * @param {string} params.redirectUrl  - URL redirect sau khi người dùng thanh toán xong
 * @param {string} [params.extraData]  - Dữ liệu thêm (base64), mặc định ""
 * @returns {{ payUrl, orderId, requestId, resultCode, message }}
 */
export async function createMomoPayment({ paymentCode, amount, orderInfo, ipnUrl, redirectUrl, extraData = "" }) {
    const orderId = paymentCode;
    const requestId = paymentCode;
    const requestType = "captureWallet";
    const amountStr = String(amount);

    // Chữ ký theo thứ tự alphabetical của tên field
    const rawSignature = [
        `accessKey=${ACCESS_KEY}`,
        `amount=${amountStr}`,
        `extraData=${extraData}`,
        `ipnUrl=${ipnUrl}`,
        `orderId=${orderId}`,
        `orderInfo=${orderInfo}`,
        `partnerCode=${PARTNER_CODE}`,
        `redirectUrl=${redirectUrl}`,
        `requestId=${requestId}`,
        `requestType=${requestType}`,
    ].join("&");

    const signature = crypto.createHmac("sha256", SECRET_KEY).update(rawSignature).digest("hex");

    const requestBody = {
        partnerCode: PARTNER_CODE,
        partnerName: "ThueXe",
        storeId: "ThueXeApp",
        requestType,
        requestId,
        amount: amountStr,
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        lang: "vi",
        autoCapture: true,
        extraData,
        signature,
    };

    const url = new URL(API_URL);
    const result = await postJson(url.hostname, "/v2/gateway/api/create", requestBody);

    if (result.resultCode !== 0) {
        throw new AppError(
            `MoMo: ${result.message || "Payment creation failed"} (resultCode: ${result.resultCode})`,
            502,
            "MOMO_CREATE_FAILED"
        );
    }

    return {
        payUrl: result.payUrl,
        orderId: result.orderId,
        requestId: result.requestId,
        resultCode: result.resultCode,
        message: result.message,
    };
}

/**
 * Xác minh chữ ký HMAC-SHA256 trên IPN callback từ MoMo.
 * MoMo gửi IPN với các field sau (trong số nhiều field khác):
 * partnerCode, orderId, requestId, amount, orderInfo, orderType,
 * transId, resultCode, message, payType, responseTime, extraData, signature
 *
 * rawSignature cho IPN theo thứ tự alphabetical:
 * accessKey=&amount=&extraData=&message=&orderId=&orderInfo=&orderType=
 * &partnerCode=&payType=&requestId=&responseTime=&resultCode=&transId=
 */
export function verifyMomoIpnSignature(ipnPayload) {
    const {
        accessKey: _ak, // MoMo không gửi accessKey trong IPN, ta tự điền
        amount,
        extraData,
        message,
        orderId,
        orderInfo,
        orderType,
        partnerCode,
        payType,
        requestId,
        responseTime,
        resultCode,
        transId,
        signature,
    } = ipnPayload;

    const rawSignature = [
        `accessKey=${ACCESS_KEY}`,
        `amount=${amount}`,
        `extraData=${extraData ?? ""}`,
        `message=${message ?? ""}`,
        `orderId=${orderId}`,
        `orderInfo=${orderInfo ?? ""}`,
        `orderType=${orderType ?? ""}`,
        `partnerCode=${partnerCode}`,
        `payType=${payType ?? ""}`,
        `requestId=${requestId}`,
        `responseTime=${responseTime ?? ""}`,
        `resultCode=${resultCode}`,
        `transId=${transId ?? ""}`,
    ].join("&");

    const expected = crypto.createHmac("sha256", SECRET_KEY).update(rawSignature).digest("hex");
    return expected === signature;
}

/**
 * Map MoMo resultCode sang trạng thái nội bộ.
 * Tài liệu: https://developers.momo.vn/v3/docs/payment/api/result-handling/
 *   0        → thành công
 *   9000     → giao dịch đã được uỷ quyền (authorized), chưa capture
 *   1000     → đang chờ xác nhận (pending - user chưa xác nhận trên app)
 *   Còn lại  → thất bại
 */
export function mapMomoResultCode(resultCode) {
    const code = Number(resultCode);
    if (code === 0) return "paid";
    if (code === 9000) return "authorized";
    if (code === 1000) return "pending";
    return "failed";
}
