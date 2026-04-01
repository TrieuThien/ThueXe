import fs from "fs/promises";
import path from "path";

const AUDIT_LOG_PATH = path.resolve(process.cwd(), "logs", "booking-audit.log");

async function ensureAuditDir() {
    const dirPath = path.dirname(AUDIT_LOG_PATH);
    await fs.mkdir(dirPath, { recursive: true });
}

export async function writeBookingAuditLog({ actor, action, bookingId, metadata = {} }) {
    const payload = {
        timestamp: new Date().toISOString(),
        action,
        booking_id: Number(bookingId),
        actor: {
            user_id: actor?.userId || null,
            role: actor?.role || null,
            user_type: actor?.userType || null,
        },
        metadata,
    };

    await ensureAuditDir();
    await fs.appendFile(AUDIT_LOG_PATH, `${JSON.stringify(payload)}\n`, "utf8");
}
