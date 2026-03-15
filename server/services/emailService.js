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
