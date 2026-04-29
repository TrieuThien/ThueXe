import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
    if (transporter) return transporter;

    if (
        !process.env.EMAIL_HOST ||
        !process.env.EMAIL_PORT ||
        !process.env.EMAIL_APP_ADMIN ||
        !process.env.EMAIL_APP_PASSWORD
    ) {
        return null;
    }

    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: {
            user: process.env.EMAIL_APP_ADMIN,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });

    return transporter;
}

export async function sendPasswordResetEmail({ toEmail, resetLink }) {
    const mailer = getTransporter();

    if (!mailer) {
        console.warn("Email service is not configured. Skip sending reset email.");
        return;
    }

    await mailer.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_APP_ADMIN,
        to: toEmail,
        subject: "ThueXe - Password Reset",
        text: `You requested to reset your password. Open this link: ${resetLink}. This link expires soon and can only be used once.`,
        html: `<p>You requested to reset your password.</p><p><a href=\"${resetLink}\">Reset password</a></p><p>This link expires soon and can only be used once.</p>`,
    });
}

export async function sendDriverActivationEmail({ toEmail, firstname, code }) {
    const mailer = getTransporter();

    if (!mailer) {
        console.warn(
            `[driver-auth] Email service not configured. OTP for ${toEmail}: ${code}`
        );
        return;
    }

    const safeName = String(firstname || "Tài xế");

    await mailer.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_APP_ADMIN,
        to: toEmail,
        subject: "ThueXe - Mã xác thực tài khoản tài xế",
        text:
            `Xin chào ${safeName},\n\n` +
            `Mã OTP xác thực tài khoản của bạn là: ${code}\n\n` +
            "Mã có hiệu lực trong một lần sử dụng. Không chia sẻ mã này cho bất kỳ ai.",
        html:
            `<p>Xin chào <strong>${safeName}</strong>,</p>` +
            `<p>Mã OTP xác thực tài khoản của bạn là:</p>` +
            `<p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0369a1">${code}</p>` +
            "<p>Mã có hiệu lực trong một lần sử dụng. Không chia sẻ mã này cho bất kỳ ai.</p>",
    });
}

export async function sendCustomerActivationEmail({ toEmail, firstname, code }) {
    const mailer = getTransporter();

    if (!mailer) {
        console.warn(
            `[customer-auth] Email service not configured. OTP for ${toEmail}: ${code}`
        );
        return;
    }

    const safeName = String(firstname || "Khach hang");

    await mailer.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_APP_ADMIN,
        to: toEmail,
        subject: "ThueXe - Mã xác thực tài khoản",
        text:
            `Xin chào ${safeName},\n\n` +
            `Mã OTP xác thực tài khoản của bạn là: ${code}\n\n` +
            "Mã có hiệu lực cho một lần sử dụng. Không chia sẻ mã này cho bất kỳ ai.",
        html:
            `<p>Xin chào <strong>${safeName}</strong>,</p>` +
            "<p>Mã OTP xác thực tài khoản của bạn là:</p>" +
            `<p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0369a1">${code}</p>` +
            "<p>Mã có hiệu lực cho một lần sử dụng. Không chia sẻ mã này cho bất kỳ ai.</p>",
    });
}

export async function sendOwnerRentalRequestEmail({
    toEmail,
    ownerName,
    customerName,
    packageName,
    startDatetime,
    durationHours,
    pickupAddress,
    rentalCode,
}) {
    const mailer = getTransporter();
    if (!mailer) {
        console.warn(`[rental] Email not configured. Skipping owner notification for rental ${rentalCode}`);
        return;
    }

    const safeOwner = String(ownerName || "Chủ xe");
    const safeCustomer = String(customerName || "Khách hàng");
    const safePackage = String(packageName || "Gói thuê");
    const safeCode = String(rentalCode || "");
    const safePickup = String(pickupAddress || "");
    const safeDuration = Number(durationHours) > 0 ? Number(durationHours) : 1;

    await mailer.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_APP_ADMIN,
        to: toEmail,
        subject: `ThueXe - Yêu cầu thuê xe mới #${safeCode}`,
        text:
            `Xin chào ${safeOwner},\n\n` +
            `Bạn vừa nhận được một yêu cầu thuê xe mới từ khách hàng.\n\n` +
            `Thông tin đơn thuê:\n` +
            `  Mã đơn     : #${safeCode}\n` +
            `  Khách hàng : ${safeCustomer}\n` +
            `  Gói thuê   : ${safePackage}\n` +
            `  Bắt đầu    : ${startDatetime}\n` +
            `  Thời lượng : ${safeDuration} giờ\n` +
            `  Điểm đón   : ${safePickup}\n\n` +
            `Vui lòng đăng nhập vào trang quản lý chủ xe để xem và xác nhận đơn thuê.`,
        html:
            `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">` +
            `<h2 style="color:#0369a1">ThueXe – Yêu cầu thuê xe mới</h2>` +
            `<p>Xin chào <strong>${safeOwner}</strong>,</p>` +
            `<p>Bạn vừa nhận được một yêu cầu thuê xe mới từ khách hàng. Vui lòng xem thông tin bên dưới và xác nhận đơn.</p>` +
            `<table style="width:100%;border-collapse:collapse;margin:16px 0">` +
            `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:40%">Mã đơn</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:700">#${safeCode}</td></tr>` +
            `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Khách hàng</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${safeCustomer}</td></tr>` +
            `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Gói thuê</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${safePackage}</td></tr>` +
            `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Thời gian bắt đầu</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${startDatetime}</td></tr>` +
            `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Thời lượng</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${safeDuration} giờ</td></tr>` +
            `<tr><td style="padding:8px;color:#6b7280">Điểm đón</td><td style="padding:8px">${safePickup}</td></tr>` +
            `</table>` +
            `<p style="margin-top:24px">Vui lòng đăng nhập vào <a href="${process.env.VEHICLE_OWNERS_URL}" style="color:#0369a1;text-decoration:underline;">trang quản lý</a> để tiếp tục xử lý hoặc từ chối yêu cầu này.</p>` +
            `</div>`,
    });
}

export async function sendOwnerRegisterVerificationEmail({ toEmail, ownerName, verifyLink, expiresMinutes = 3 }) {
    const mailer = getTransporter();
    if (!mailer) {
        throw new Error("Email service is not configured.");
    }

    const safeOwnerName = String(ownerName || "chu xe");
    const safeExpiresMinutes = Number(expiresMinutes) > 0 ? Number(expiresMinutes) : 3;

    await mailer.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_APP_ADMIN,
        to: toEmail,
        subject: "ThueXe - Xác thực email đăng ký tài khoản chủ xe",
        text:
            `Xin chào ${safeOwnerName},\n\n` +
            `Bạn vừa đăng ký tài khoản chủ xe trên ThueXe.\n` +
            `Vui lòng bấm nút xác thực email trong vòng ${safeExpiresMinutes} phút bằng cách mở liên kết sau:\n${verifyLink}\n\n` +
            "Nếu bạn không nhấn xác thực trong thời gian quy định, yêu cầu đăng ký sẽ tự động hủy.",
        html:
            `<p>Xin chào <strong>${safeOwnerName}</strong>,</p>` +
            "<p>Bạn vừa đăng ký tài khoản chủ xe trên <strong>ThueXe</strong>.</p>" +
            `<p>Vui lòng bấm nút xác thực email trong vòng <strong>${safeExpiresMinutes} phút</strong>.</p>` +
            `<p><a href="${verifyLink}" style="display:inline-block;padding:10px 16px;background:#0369a1;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Xác thực email ngay</a></p>` +
            "<p>Nếu bạn không nhấn xác thực trong thời gian quy định, yêu cầu đăng ký sẽ tự động hủy.</p>",
    });
}
