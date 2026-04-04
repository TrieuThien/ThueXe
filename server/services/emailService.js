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
