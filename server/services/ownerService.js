import crypto from "crypto";
import { calcOwnerRequiredBalance } from "../repositories/walletRepository.js";
import { createMomoPayment, mapMomoResultCode } from "./payment/momoService.js";
import { publishRealtimeEvent } from "../utils/realtime.js";
import sqldb from "../config/sqldatabase.js";
import AppError from "../utils/appError.js";
import { uploadBufferToCloudinary } from "../config/cloudinary.js";
import { clearInflightPromise, consumeCachedResponse, getInflightPromise, rememberIdempotentResponse, rememberInflightPromise } from "../utils/idempotencyCache.js";
import { withUserMutex } from "../utils/userMutex.js";
import { generateCodeToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/token.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { sendOwnerRegisterVerificationEmail } from "./emailService.js";
import {
    cancelPendingOwnerRegisterRequestsByIdentifier,
    createMaintenance,
    createOwner,
    createOwnerRegisterRequest,
    createOwnerSession,
    createOwnerVehicle,
    createOwnerWallet,
    createPayment,
    createWalletLedger,
    createWithdrawalRequest,
    deleteMaintenance,
    deleteAllOwnerSessions,
    deleteOwnerSession,
    expirePendingOwnerRegisterRequests,
    findContractByOwner,
    findOwnerByEmail,
    findOwnerById,
    findOwnerByIdentifier,
    findOwnerRegisterRequestByTokenHash,
    findOwnerMaintenanceById,
    findOwnerByPhone,
    findOwnerRentalById,
    findOwnerSession,
    findOwnerVehicleById,
    findOwnerWallet,
    findPaymentByCodeForUpdate,
    findVehicleByPlate,
    findVehicleByVin,
    findVehicleTypeById,
    findWalletByIdForUpdate,
    getDefaultCurrencyId,
    getOwnerRevenueByVehicle,
    getOwnerRevenueTotals,
    getOwnerWithdrawalTotals,
    getOwnerMonthlyRevenueTrend,
    getOwnerDashboardSummary,
    listContractsByOwner,
    listOwnerDocuments,
    listOwnerMaintenanceRecords,
    listOwnerPayments,
    listOwnerRequiredDocuments,
    listOwnerRentals,
    listOwnerVehicles,
    listOwnerVehiclesSimple,
    listOwnerWalletLedger,
    listOwnerWithdrawals,
    listVehicleDocumentTypes,
    listVehicleDocuments,
    listVehicleTypes,
    markOwnerRegisterRequestCancelled,
    markOwnerRegisterRequestExpired,
    markOwnerRegisterRequestVerified,
    updateMaintenance,
    updateOwnerLastLogin,
    updateOwnerPassword,
    updateOwnerProfile,
    updateOwnerRentalStatus,
    updateOwnerVerificationState,
    updateOwnerVehicle,
    updatePaymentStatus,
    updateVehiclePhotoUrl,
    updateVehicleInteriorPhotoUrls,
    updateVehicleVerificationStatus,
    updateWalletBalance,
    upsertOwnerDocument,
    upsertVehicleDocument,
    updateVehicleOperationStatus,
    listVehicleRentalBookingBlocks,
    listOwnerVehicleMaintenanceForCalendar,
    deleteOwnerVehicleMaintenance,
    listRentalStatusHistory,
} from "../repositories/ownerRepository.js";

const OWNER_USER_TYPE = 2;
const OWNER_REGISTER_VERIFY_EXPIRES_MINUTES = Math.max(
    Number(process.env.OWNER_REGISTER_VERIFY_EXPIRES_MINUTES) || 3,
    1
);
const BOOKING_STATUS_MAP = {
    scheduled: "confirmed",
    pending: "pending",
    in_progress: "in_progress",
    completed: "completed",
    cancelled: "canceled",
};
const BOOKING_STATUS_REVERSE_MAP = {
    pending: "pending",
    confirmed: "scheduled",
    in_progress: "in_progress",
    completed: "completed",
    canceled: "cancelled",
};
const BOOKING_TRANSITIONS = {
    pending: ["confirmed", "canceled"],
    confirmed: ["in_progress", "canceled"],
    in_progress: ["completed", "canceled"],
    completed: [],
    canceled: [],
};
const AVAILABILITY_TYPE_MAP = {
    booking: "booking",
    booked: "booking",
    maintenance: "maintenance",
    manual_block: "manual_block",
    unavailable: "manual_block",
    manual_available: "manual_available",
    available: "manual_available",
};
const AVAILABILITY_TYPE_TO_CLIENT_MAP = {
    booking: "booked",
    maintenance: "maintenance",
    manual_block: "unavailable",
    manual_available: "available",
};

function normalizeIdentifier(identifier) {
    const value = String(identifier || "").trim();
    if (!value) return "";
    if (value.includes("@")) return value.toLowerCase();
    return value;
}

function normalizePagination(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || query.limit) || 10, 1), 100);
    return { page, pageSize };
}

function ensureValidDate(value, fieldName) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new AppError(`${fieldName} is invalid`, 422, "VALIDATION_ERROR");
    }
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function buildPaymentCode(prefix) {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function buildOwnerRegisterVerifyToken() {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    return { rawToken, tokenHash };
}

function normalizeAvailabilityType(typeInput) {
    if (!typeInput) return null;
    const normalized = AVAILABILITY_TYPE_MAP[String(typeInput).trim()];
    if (!normalized) {
        throw new AppError("Invalid availability type.", 422, "VALIDATION_ERROR");
    }
    return normalized;
}

function mapAvailabilityTypeToClient(typeInput) {
    if (!typeInput) return "unavailable";
    return AVAILABILITY_TYPE_TO_CLIENT_MAP[String(typeInput).trim()] || "unavailable";
}

function buildOwnerVerifyEmailLink(rawToken) {
    const fallbackBaseUrl = "http://localhost:8000/api/owner/auth/verify-email";
    const configuredBaseUrl = String(process.env.OWNER_REGISTER_VERIFY_URL || "").trim();

    const createLink = (baseUrl) => {
        const url = new URL(baseUrl);
        if (!url.hostname) {
            throw new Error("Invalid OWNER_REGISTER_VERIFY_URL");
        }
        url.searchParams.set("token", rawToken);
        return url.toString();
    };

    try {
        return createLink(configuredBaseUrl || fallbackBaseUrl);
    } catch (_error) {
        return createLink(fallbackBaseUrl);
    }
}

function ensureOwnerAuth(auth) {
    if (!auth || auth.role !== "owner") {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    return Number(auth.userId);
}

function toSqlDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

function ensureStrongPassword(password) {
    const input = String(password || "");
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strong.test(input)) {
        throw new AppError("Password is too weak.", 422, "WEAK_PASSWORD");
    }
}

async function runInTx(work) {
    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();
        const result = await work(conn);
        await conn.commit();
        return result;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

function sanitizeOwner(owner) {
    return {
        id: Number(owner.owner_id),
        ownerId: Number(owner.owner_id),
        fullName: owner.fullname,
        email: owner.email,
        phoneNumber: owner.phone,
        phone: owner.phone,
        address: owner.address,
        bankInfo: {
            bankName: owner.bank_name,
            accountNumber: owner.bank_account,
            bankCode: owner.bank_code,
            swiftCode: owner.swift_code,
        },
        accountStatus: Number(owner.status) === 1 ? "active" : "locked",
        verificationStatus: owner.verification_status || "not_submitted",
        createdAt: owner.date_created,
    };
}

async function issueOwnerTokenPair(owner, conn) {
    const tokenId = generateCodeToken(10);
    const accessToken = signAccessToken({
        sub: Number(owner.owner_id),
        role: "owner",
        userType: OWNER_USER_TYPE,
    });
    const refreshToken = signRefreshToken({
        sub: Number(owner.owner_id),
        role: "owner",
        userType: OWNER_USER_TYPE,
        tid: tokenId,
    });
    await createOwnerSession({ ownerId: Number(owner.owner_id), token: tokenId }, conn);
    return { accessToken, refreshToken, tokenType: "Bearer" };
}

export async function ownerRegister(payload) {
    const email = String(payload.email || "").trim().toLowerCase();
    const phone = String(payload.phoneNumber || "").trim();
    if (!email || !phone) throw new AppError("Email and phone are required.", 422, "VALIDATION_ERROR");
    ensureStrongPassword(payload.password);

    const [emailUsed, phoneUsed] = await Promise.all([findOwnerByEmail(email), findOwnerByPhone(phone)]);
    if (emailUsed) throw new AppError("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    if (phoneUsed) throw new AppError("Phone already exists.", 409, "PHONE_ALREADY_EXISTS");

    const passwordHash = await hashPassword(payload.password);
    const { rawToken, tokenHash } = buildOwnerRegisterVerifyToken();
    const nowEpochMs = Date.now();
    const expiresAtEpochMs = nowEpochMs + OWNER_REGISTER_VERIFY_EXPIRES_MINUTES * 60 * 1000;

    const requestId = await runInTx(async (conn) => {
        await expirePendingOwnerRegisterRequests(nowEpochMs, conn);
        await cancelPendingOwnerRegisterRequestsByIdentifier(email, phone, conn);
        return createOwnerRegisterRequest(
            {
                full_name: payload.fullName,
                phone,
                email,
                address: payload.address || null,
                bank_name: payload.bankInfo?.bankName || null,
                bank_account: payload.bankInfo?.accountNumber || null,
                bank_code: payload.bankInfo?.bankCode || null,
                swift_code: payload.bankInfo?.swiftCode || null,
                password_hash: passwordHash,
                verify_token_hash: tokenHash,
                expires_at_epoch: expiresAtEpochMs,
            },
            conn
        );
    });

    const verifyLink = buildOwnerVerifyEmailLink(rawToken);

    try {
        await sendOwnerRegisterVerificationEmail({
            toEmail: email,
            ownerName: payload.fullName,
            verifyLink,
            expiresMinutes: OWNER_REGISTER_VERIFY_EXPIRES_MINUTES,
        });
    } catch (_error) {
        await runInTx(async (conn) => {
            await markOwnerRegisterRequestCancelled(requestId, conn);
        });
        throw new AppError(
            "Could not send verification email. Please try registering again later.",
            503,
            "OWNER_REGISTER_EMAIL_SEND_FAILED"
        );
    }

    return {
        status: "pending_email_verification",
        verificationTicket: `OWN-REG-${requestId}`,
        expiresAt: new Date(expiresAtEpochMs).toISOString(),
        message: `Verification email has been sent. Please verify within ${OWNER_REGISTER_VERIFY_EXPIRES_MINUTES} minutes.`,
    };
}

export async function verifyOwnerRegisterEmailToken(token) {
    const rawToken = String(token || "").trim();
    if (!rawToken) {
        throw new AppError("Verification token is required.", 422, "VALIDATION_ERROR");
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const data = await runInTx(async (conn) => {
        const nowEpochMs = Date.now();
        await expirePendingOwnerRegisterRequests(nowEpochMs, conn);
        const request = await findOwnerRegisterRequestByTokenHash(tokenHash, conn, { forUpdate: true });
        if (!request) {
            throw new AppError("Invalid verification link.", 400, "INVALID_OWNER_REGISTER_VERIFY_TOKEN");
        }
        if (request.status !== "pending") {
            throw new AppError("Verification link is no longer valid.", 400, "OWNER_REGISTER_VERIFY_TOKEN_USED");
        }

        const expired = Number(request.expires_at_epoch || 0) < nowEpochMs;
        if (expired) {
            await markOwnerRegisterRequestExpired(Number(request.id), conn);
            throw new AppError("Verification link has expired.", 400, "OWNER_REGISTER_VERIFY_TOKEN_EXPIRED");
        }

        const [emailUsed, phoneUsed] = await Promise.all([
            findOwnerByEmail(request.email, conn),
            findOwnerByPhone(request.phone, conn),
        ]);
        if (emailUsed || phoneUsed) {
            await markOwnerRegisterRequestCancelled(Number(request.id), conn);
            throw new AppError("Account already exists.", 409, "OWNER_ACCOUNT_ALREADY_EXISTS");
        }

        const ownerId = await createOwner(
            {
                fullname: request.full_name,
                phone: request.phone,
                email: request.email,
                address: request.address || null,
                bank_name: request.bank_name || null,
                bank_account: request.bank_account || null,
                bank_code: request.bank_code || null,
                swift_code: request.swift_code || null,
                password_hash: request.password_hash,
            },
            conn
        );
        await markOwnerRegisterRequestVerified(Number(request.id), ownerId, conn);

        return {
            ownerId,
            fullName: request.full_name,
            email: request.email,
        };
    });

    return {
        status: "verified",
        message: "Email verified successfully. Owner account has been created.",
        ...data,
    };
}

export async function ownerLogin(payload) {
    const identifier = normalizeIdentifier(payload.identifier);
    const owner = await findOwnerByIdentifier(identifier);
    if (!owner || Number(owner.account_deleted || 0) === 1) {
        throw new AppError("Invalid credentials.", 401, "INVALID_CREDENTIALS");
    }
    const passOk = await verifyPassword(payload.password, owner.password_hash);
    if (!passOk) throw new AppError("Invalid credentials.", 401, "INVALID_CREDENTIALS");
    if (Number(owner.account_active || 0) !== 1 || Number(owner.is_activated || 0) !== 1) {
        throw new AppError("Owner account is inactive.", 403, "ACCOUNT_INACTIVE");
    }

    return runInTx(async (conn) => {
        await updateOwnerLastLogin(owner.owner_id, conn);
        const tokens = await issueOwnerTokenPair(owner, conn);
        return {
            ...tokens,
            owner: sanitizeOwner(owner),
        };
    });
}

export async function ownerRefreshToken(refreshTokenValue) {
    let decoded;
    try {
        decoded = verifyRefreshToken(refreshTokenValue);
    } catch (_error) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }
    if (decoded.role !== "owner" || Number(decoded.userType) !== OWNER_USER_TYPE) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    const ownerId = Number(decoded.sub);
    const session = await findOwnerSession({ ownerId, token: decoded.tid });
    if (!session) throw new AppError("Refresh token expired.", 401, "SESSION_NOT_FOUND");
    const owner = await findOwnerById(ownerId);
    if (!owner) throw new AppError("Owner not found.", 404, "OWNER_NOT_FOUND");

    return runInTx(async (conn) => {
        await deleteOwnerSession({ ownerId, token: decoded.tid }, conn);
        const tokens = await issueOwnerTokenPair(owner, conn);
        return {
            ...tokens,
            owner: sanitizeOwner(owner),
        };
    });
}

export async function ownerLogout(auth, refreshTokenValue) {
    const ownerId = ensureOwnerAuth(auth);
    if (!refreshTokenValue) {
        await runInTx(async (conn) => {
            await deleteAllOwnerSessions(ownerId, conn);
        });
        return { message: "Logged out." };
    }
    let decoded = null;
    try {
        decoded = verifyRefreshToken(refreshTokenValue);
    } catch (_error) {
        return { message: "Logged out." };
    }
    await runInTx(async (conn) => {
        await deleteOwnerSession({ ownerId, token: decoded.tid }, conn);
    });
    return { message: "Logged out." };
}

export async function getOwnerVerificationStatus(auth) {
    const ownerId = ensureOwnerAuth(auth);
    const [owner, requiredDocs, submittedDocs] = await Promise.all([
        findOwnerById(ownerId),
        listOwnerRequiredDocuments(),
        listOwnerDocuments(ownerId),
    ]);
    if (!owner) throw new AppError("Owner not found.", 404, "OWNER_NOT_FOUND");
    const progressPercent = requiredDocs.length
        ? Math.round((submittedDocs.filter((item) => item.file_url).length / requiredDocs.length) * 100)
        : 0;

    return {
        ownerId,
        status: owner.verification_status || "not_submitted",
        progressPercent,
        submittedAt: owner.verification_submitted_at,
        reviewedAt: owner.verification_reviewed_at,
        adminNote: owner.verification_admin_note || "",
    };
}

export async function getOwnerVerificationRequiredDocuments() {
    const docs = await listOwnerRequiredDocuments();
    return {
        items: docs.map((doc) => ({
            id: Number(doc.id),
            title: doc.title,
            description: doc.doc_desc,
            required: true,
            requiresNumber: Number(doc.doc_id_num || 0) === 1,
            requiresExpiryDate: Number(doc.doc_expiry || 0) === 1,
            documentNumberLabel: doc.doc_id_num_title || "Document number",
            acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
            maxSizeMB: 10,
        })),
    };
}

function mapVerificationDoc(doc, requiredMap) {
    const required = requiredMap.get(Number(doc.document_id));
    return {
        id: Number(doc.id),
        documentTypeId: Number(doc.document_id),
        title: required?.title || doc.document_title,
        documentNumber: doc.doc_number || "",
        expiryDate: doc.doc_expiry_date || "",
        fileUrl: doc.file_url || "",
        fileName: doc.file_url ? String(doc.file_url).split("/").pop() : "",
        mimeType: doc.mime_type || "",
        fileSize: Number(doc.file_size || 0),
        status: doc.status || "pending",
        adminNote: doc.review_note || "",
        updatedAt: doc.updated_at || doc.date_submitted,
    };
}

export async function getOwnerVerificationSubmission(auth) {
    const ownerId = ensureOwnerAuth(auth);
    const [owner, requiredDocs, documents] = await Promise.all([
        findOwnerById(ownerId),
        listOwnerRequiredDocuments(),
        listOwnerDocuments(ownerId),
    ]);
    if (!owner) throw new AppError("Owner not found.", 404, "OWNER_NOT_FOUND");
    const map = new Map(requiredDocs.map((item) => [Number(item.id), item]));

    return {
        ownerId,
        status: owner.verification_status || "not_submitted",
        submittedAt: owner.verification_submitted_at,
        reviewedAt: owner.verification_reviewed_at,
        adminNote: owner.verification_admin_note || "",
        documents: documents.map((doc) => mapVerificationDoc(doc, map)),
    };
}

async function uploadOwnerDocFile(file, folder) {
    if (!file) throw new AppError("File is required.", 422, "VALIDATION_ERROR");
    if (file.size > 10 * 1024 * 1024) throw new AppError("File too large.", 422, "DOCUMENT_TOO_LARGE");
    const uploaded = await uploadBufferToCloudinary(file.buffer, { folder, resource_type: "auto" });
    return { file_url: uploaded.secure_url, mime_type: file.mimetype, file_size: file.size };
}

export async function uploadOwnerVerificationDocument(auth, payload, file) {
    const ownerId = ensureOwnerAuth(auth);
    const requiredDocs = await listOwnerRequiredDocuments();
    const docId = Number(payload.documentTypeId);
    if (!requiredDocs.some((item) => Number(item.id) === docId)) {
        throw new AppError("Document type not allowed.", 422, "INVALID_DOCUMENT_TYPE");
    }
    const uploaded = await uploadOwnerDocFile(file, `thuexe/owners/${ownerId}/verification`);

    await runInTx(async (conn) => {
        await upsertOwnerDocument(ownerId, {
            document_id: docId,
            doc_number: payload.documentNumber || null,
            doc_expiry_date: toSqlDate(payload.expiryDate),
            ...uploaded,
        }, conn);
        await updateOwnerVerificationState(ownerId, {
            verification_status: "not_submitted",
            verification_submitted_at: null,
            verification_admin_note: null,
        }, conn);
    });
    return { documentTypeId: docId, fileName: file.originalname, fileUrl: uploaded.file_url };
}

export async function updateOwnerVerificationDocument(auth, documentTypeId, payload, file) {
    return uploadOwnerVerificationDocument(auth, { ...payload, documentTypeId }, file);
}

export async function submitOwnerVerification(auth) {
    const ownerId = ensureOwnerAuth(auth);
    const [requiredDocs, submittedDocs] = await Promise.all([
        listOwnerRequiredDocuments(),
        listOwnerDocuments(ownerId),
    ]);
    const submittedSet = new Set(submittedDocs.filter((item) => item.file_url).map((item) => Number(item.document_id)));
    const missing = requiredDocs.filter((item) => !submittedSet.has(Number(item.id)));
    if (missing.length > 0) {
        throw new AppError("Missing required documents.", 422, "MISSING_REQUIRED_DOCUMENTS", missing.map((item) => Number(item.id)));
    }

    await runInTx(async (conn) => {
        await updateOwnerVerificationState(ownerId, {
            verification_status: "pending_review",
            verification_submitted_at: new Date().toISOString().slice(0, 19).replace("T", " "),
            verification_admin_note: null,
        }, conn);
    });
    return { status: "pending_review", submittedAt: new Date().toISOString(), missingDocuments: [] };
}

export async function getOwnerAccountProfile(auth) {
    const ownerId = ensureOwnerAuth(auth);
    const owner = await findOwnerById(ownerId);
    if (!owner) throw new AppError("Owner not found.", 404, "OWNER_NOT_FOUND");
    return sanitizeOwner(owner);
}

export async function updateOwnerAccountProfile(auth, payload) {
    const ownerId = ensureOwnerAuth(auth);
    const owner = await findOwnerById(ownerId);
    if (!owner) throw new AppError("Owner not found.", 404, "OWNER_NOT_FOUND");
    const normalizedPhone = String(payload.phoneNumber || "").trim();
    if (!normalizedPhone) throw new AppError("Phone is required.", 422, "VALIDATION_ERROR");
    const existingByPhone = await findOwnerByPhone(normalizedPhone);
    if (existingByPhone && Number(existingByPhone.owner_id) !== ownerId) {
        throw new AppError("Phone already exists.", 409, "PHONE_ALREADY_EXISTS");
    }
    await updateOwnerProfile(ownerId, {
        fullname: String(payload.fullName || owner.fullname).trim(),
        phone: normalizedPhone,
        address: payload.address || null,
        bank_name: payload.bankName || null,
        bank_account: payload.bankAccountNumber || null,
        bank_code: payload.bankCode || null,
        swift_code: payload.swiftCode || null,
    });
    return getOwnerAccountProfile(auth);
}

export async function changeOwnerPassword(auth, payload) {
    const ownerId = ensureOwnerAuth(auth);
    const owner = await findOwnerById(ownerId);
    if (!owner) throw new AppError("Owner not found.", 404, "OWNER_NOT_FOUND");
    const currentOk = await verifyPassword(payload.currentPassword, owner.password_hash);
    if (!currentOk) throw new AppError("Current password is incorrect.", 409, "INVALID_CURRENT_PASSWORD");
    ensureStrongPassword(payload.newPassword);
    const hash = await hashPassword(payload.newPassword);
    await updateOwnerPassword(ownerId, hash);
    await runInTx(async (conn) => {
        await deleteAllOwnerSessions(ownerId, conn);
    });
    return { success: true };
}

export async function getOwnerAccountSummary(auth) {
    const ownerId = ensureOwnerAuth(auth);
    const [vehiclesData, stats] = await Promise.all([
        listOwnerVehicles(ownerId, { page: 1, pageSize: 1 }),
        getOwnerDashboardSummary(ownerId),
    ]);
    return {
        totalVehicles: vehiclesData.total,
        activeVehicles: stats.active_vehicles,
        pendingBookings: stats.pending_bookings,
        monthlyRevenue: stats.monthly_revenue,
    };
}

export async function getOwnerDashboard(auth) {
    const ownerId = ensureOwnerAuth(auth);
    const [profile, summary, rentals, withdrawals, monthlyTrend] = await Promise.all([
        getOwnerAccountProfile(auth),
        getOwnerAccountSummary(auth),
        listOwnerRentals(ownerId, { page: 1, pageSize: 5 }),
        listOwnerWithdrawals(ownerId, { page: 1, pageSize: 5 }),
        getOwnerMonthlyRevenueTrend(ownerId),
    ]);
    return {
        profile,
        summary,
        monthlyTrend,
        latestBookings: rentals.items.map((item) => ({
            id: item.rental_id,
            code: item.rental_code,
            vehicleName: [item.brand, item.model].filter(Boolean).join(' ') || null,
            customerName: [item.firstname, item.lastname].filter(Boolean).join(' ') || null,
            startDate: item.start_datetime,
            status: BOOKING_STATUS_MAP[item.status] || item.status,
            totalAmount: Number(item.total_price || 0) - Number(item.deposit_amount || 0),
        })),
        latestWithdrawals: withdrawals.items.map((item) => ({
            id: String(item.withdrawal_id),
            requestCode: `WD-${item.withdrawal_id}`,
            amount: Number(item.amount || 0),
            status: item.status,
            createdAt: item.requested_at,
        })),
    };
}

async function ensureOwnerWallet(ownerId, conn = null) {
    const existing = await findOwnerWallet(ownerId, conn);
    if (existing) return existing;
    const currencyId = await getDefaultCurrencyId();
    const walletId = await createOwnerWallet(ownerId, currencyId, conn);
    return { wallet_id: walletId, actor_type: 2, actor_id: ownerId, currency_id: currencyId, balance: 0, status: 1 };
}

function mapVehicleListItem(row, documentRows) {
    const missingDocumentCount = documentRows.filter((item) => !item.file_url).length;
    return {
        id: Number(row.vehicle_id),
        typeId: Number(row.type_id),
        plateNumber: row.license_plate,
        vehicleType: row.type_name,
        brand: row.brand || "",
        model: row.model || "",
        productionYear: row.year ? Number(row.year) : null,
        usageStatus: row.status,
        verificationStatus: row.verification_status || (Number(row.is_verified) === 1 ? "verified" : "pending_review"),
        addedAt: row.date_added,
        missingDocumentCount,
    };
}

function mapVehicleDetail(row, documents = []) {
    const interiorPhotoUrls = (() => {
        try {
            const parsed = JSON.parse(row.interior_photo_urls || "[]");
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
            return [];
        }
    })();
    return {
        id: Number(row.vehicle_id),
        typeId: Number(row.type_id),
        vehicleType: row.type_name,
        brand: row.brand,
        model: row.model,
        productionYear: row.year ? Number(row.year) : null,
        color: row.color,
        plateNumber: row.license_plate,
        vin: row.vin,
        seats: Number(row.seat_count || 0),
        transmission: row.transmission,
        fuelType: row.fuel_type,
        odometerKm: Number(row.odometer_km || 0),
        notes: row.notes || "",
        photoUrl: row.photo_url || null,
        interiorPhotoUrls,
        usageStatus: row.status,
        verificationStatus: row.verification_status || (Number(row.is_verified) === 1 ? "verified" : "pending_review"),
        addedAt: row.date_added,
        location: row.current_long && row.current_lat ? { lng: Number(row.current_long), lat: Number(row.current_lat) } : null,
        documents,
    };
}

export async function getOwnerVehicleTypes() {
    const items = await listVehicleTypes();
    return {
        items: items.map((item) => ({
            id: Number(item.type_id),
            name: item.type_name,
            description: item.description || "",
            seats: Number(item.seat_count || 0),
        })),
    };
}

export async function getOwnerVehicleDocumentTypes() {
    const items = await listVehicleDocumentTypes();
    return {
        items: items.map((item) => ({
            id: Number(item.id),
            title: item.title,
            description: item.doc_desc,
            required: true,
            requiresNumber: Number(item.doc_id_num || 0) === 1,
            requiresExpiryDate: Number(item.doc_expiry || 0) === 1,
            requiresTwoSides: Number(item.doc_two_sides || 0) === 1,
            documentNumberLabel: item.doc_id_num_title || "Document number",
            acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
            maxSizeMB: 10,
        })),
    };
}

async function resolveVehicleVerificationStatus(vehicleId) {
    const docs = await listVehicleDocuments(vehicleId);
    const missing = docs.some((item) => !item.file_url);
    return missing ? "missing_documents" : "pending_review";
}

export async function createOwnerVehicleService(auth, payload, uploadedFiles = []) {
    const ownerId = ensureOwnerAuth(auth);
    const plate = String(payload.plateNumber || "").trim().toUpperCase();
    if (!plate) throw new AppError("Plate is required.", 422, "VALIDATION_ERROR");
    if (await findVehicleByPlate(plate)) throw new AppError("Plate already exists.", 409, "PLATE_ALREADY_EXISTS");
    const vin = String(payload.vin || "").trim().toUpperCase();
    if (vin && await findVehicleByVin(vin)) throw new AppError("VIN already exists.", 409, "VIN_ALREADY_EXISTS");
    const type = await findVehicleTypeById(Number(payload.vehicleType));
    if (!type) throw new AppError("Vehicle type not found.", 404, "VEHICLE_TYPE_NOT_FOUND");

    const vehiclePhotoFiles = uploadedFiles.filter((f) => f.fieldname === "vehicle_photo");
    const interiorPhotoFiles = uploadedFiles.filter((f) => f.fieldname === "vehicle_interior_photo");

    if (vehiclePhotoFiles.length > 1) {
        throw new AppError("Maximum 1 exterior photo is allowed.", 422, "MAX_EXTERIOR_PHOTOS_EXCEEDED");
    }
    if (interiorPhotoFiles.length > 3) {
        throw new AppError("Maximum 3 interior photos are allowed.", 422, "MAX_INTERIOR_PHOTOS_EXCEEDED");
    }

    const fileMap = new Map();
    for (const f of uploadedFiles) {
        if (String(f.fieldname || "").startsWith("file_")) {
            fileMap.set(f.fieldname, f);
        }
    }

    const vehicleId = await runInTx(async (conn) => {
        const createdId = await createOwnerVehicle(ownerId, {
            type_id: Number(payload.vehicleType),
            brand: payload.brand,
            model: payload.model,
            year: payload.productionYear ? String(payload.productionYear) : null,
            color: payload.color || null,
            license_plate: plate,
            vin: vin || null,
            seat_count: Number(payload.seats || type.seat_count || 4),
            transmission: payload.transmission || "auto",
            fuel_type: payload.fuelType || "petrol",
            odometer_km: Number(payload.odometerKm || 0),
            status: "unavailable",
            notes: payload.notes || null,
            verification_status: "missing_documents",
        }, conn);

        const vehiclePhotoFile = vehiclePhotoFiles[0];
        if (vehiclePhotoFile) {
            const uploaded = await uploadBufferToCloudinary(vehiclePhotoFile.buffer, {
                folder: `thuexe/vehicles/${createdId}/photo`,
                resource_type: "image",
            });
            await updateVehiclePhotoUrl(createdId, uploaded.secure_url, conn);
        }

        if (interiorPhotoFiles.length > 0) {
            const uploadedInteriorUrls = [];
            for (const interiorPhotoFile of interiorPhotoFiles) {
                const uploaded = await uploadBufferToCloudinary(interiorPhotoFile.buffer, {
                    folder: `thuexe/vehicles/${createdId}/interior`,
                    resource_type: "image",
                });
                uploadedInteriorUrls.push(uploaded.secure_url);
            }
            await updateVehicleInteriorPhotoUrls(createdId, uploadedInteriorUrls, conn);
        }

        for (const doc of payload.documents || []) {
            if (!doc.documentTypeId) continue;
            const side = doc.side || 'single';
            const uploadedFile = fileMap.get(`file_${doc.documentTypeId}_${side}`);
            let fileUrl = doc.fileUrl || null;
            let mimeType = doc.mimeType || null;
            let fileSize = doc.fileSize || null;
            if (uploadedFile) {
                const uploaded = await uploadBufferToCloudinary(uploadedFile.buffer, {
                    folder: `thuexe/vehicles/${createdId}/documents`,
                    resource_type: "auto",
                });
                fileUrl = uploaded.secure_url;
                mimeType = uploadedFile.mimetype;
                fileSize = uploadedFile.size;
            }
            await upsertVehicleDocument(createdId, {
                document_id: Number(doc.documentTypeId),
                side,
                doc_number: doc.documentNumber || null,
                doc_expiry_date: toSqlDate(doc.expiryDate),
                file_url: fileUrl,
                mime_type: mimeType,
                file_size: fileSize,
            }, conn);
        }
        const verificationStatus = await resolveVehicleVerificationStatus(createdId);
        await updateVehicleVerificationStatus(createdId, verificationStatus, conn);
        return createdId;
    });

    return getOwnerVehicleDetailService(auth, vehicleId);
}

export async function getOwnerVehiclesService(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const { page, pageSize } = normalizePagination(query);
    const listed = await listOwnerVehicles(ownerId, {
        search: query.search || "",
        status: query.status || "all",
        page,
        pageSize,
    });
    const items = [];
    for (const row of listed.items) {
        const docs = await listVehicleDocuments(Number(row.vehicle_id));
        items.push(mapVehicleListItem(row, docs));
    }
    return { items, page, pageSize, total: listed.total };
}

export async function getOwnerVehicleDetailService(auth, vehicleIdInput) {
    const ownerId = ensureOwnerAuth(auth);
    const vehicleId = Number(vehicleIdInput);
    const vehicle = await findOwnerVehicleById(ownerId, vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
    const docs = await listVehicleDocuments(vehicleId);
    return mapVehicleDetail(vehicle, docs.map((item) => ({
        id: Number(item.id),
        documentTypeId: Number(item.document_id),
        documentTitle: item.document_title || "",
        side: item.side || "single",
        requiresTwoSides: Number(item.doc_two_sides || 0) === 1,
        fileName: item.file_url ? String(item.file_url).split("/").pop() : "",
        fileUrl: item.file_url || "",
        mimeType: item.mime_type || "",
        fileSize: Number(item.file_size || 0),
        documentNumber: item.doc_number || "",
        expiryDate: item.doc_expiry_date || "",
        status: item.status || "pending",
        reviewNote: item.review_note || "",
    })));
}

export async function updateOwnerVehicleService(auth, vehicleIdInput, payload) {
    const ownerId = ensureOwnerAuth(auth);
    const vehicleId = Number(vehicleIdInput);
    const vehicle = await findOwnerVehicleById(ownerId, vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
    const plate = String(payload.plateNumber || vehicle.license_plate).trim().toUpperCase();
    const vin = String(payload.vin || vehicle.vin || "").trim().toUpperCase();
    if (await findVehicleByPlate(plate, vehicleId)) throw new AppError("Plate already exists.", 409, "PLATE_ALREADY_EXISTS");
    if (vin && await findVehicleByVin(vin, vehicleId)) throw new AppError("VIN already exists.", 409, "VIN_ALREADY_EXISTS");

    await updateOwnerVehicle(ownerId, vehicleId, {
        type_id: Number(payload.vehicleType || vehicle.type_id),
        brand: payload.brand || vehicle.brand,
        model: payload.model || vehicle.model,
        year: payload.productionYear ? String(payload.productionYear) : vehicle.year,
        color: payload.color || vehicle.color,
        license_plate: plate,
        vin: vin || null,
        seat_count: Number(payload.seats || vehicle.seat_count),
        transmission: payload.transmission || vehicle.transmission,
        fuel_type: payload.fuelType || vehicle.fuel_type,
        odometer_km: Number(payload.odometerKm ?? vehicle.odometer_km),
        status: payload.usageStatus || vehicle.status,
        notes: payload.notes || vehicle.notes,
    });

    if (vehicle.verification_status === "verified" || vehicle.verification_status === "rejected") {
        await updateVehicleVerificationStatus(vehicleId, "pending_review");
    }

    return getOwnerVehicleDetailService(auth, vehicleId);
}

export async function upsertOwnerVehicleDocumentsService(auth, vehicleIdInput, payload, uploadedFiles = []) {
    const ownerId = ensureOwnerAuth(auth);
    const vehicleId = Number(vehicleIdInput);
    const vehicle = await findOwnerVehicleById(ownerId, vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");

    // Build a map of uploaded files keyed by field name: file_<documentTypeId>_<side>
    const fileMap = new Map();
    for (const f of uploadedFiles) {
        fileMap.set(f.fieldname, f);
    }

    await runInTx(async (conn) => {
        for (const doc of payload.documents || []) {
            const side = doc.side || 'single';
            const fieldName = `file_${doc.documentTypeId}_${side}`;
            const uploadedFile = fileMap.get(fieldName);

            let fileUrl = doc.fileUrl || null;
            let mimeType = doc.mimeType || null;
            let fileSize = doc.fileSize || null;

            if (uploadedFile) {
                const uploaded = await uploadBufferToCloudinary(uploadedFile.buffer, {
                    folder: `thuexe/vehicles/${vehicleId}/documents`,
                    resource_type: "auto",
                });
                fileUrl = uploaded.secure_url;
                mimeType = uploadedFile.mimetype;
                fileSize = uploadedFile.size;
            }

            await upsertVehicleDocument(vehicleId, {
                document_id: Number(doc.documentTypeId),
                side,
                doc_number: doc.documentNumber || null,
                doc_expiry_date: toSqlDate(doc.expiryDate),
                file_url: fileUrl,
                mime_type: mimeType,
                file_size: fileSize,
            }, conn);
        }
        const verificationStatus = await resolveVehicleVerificationStatus(vehicleId);
        await updateVehicleVerificationStatus(vehicleId, verificationStatus, conn);
    });

    const detail = await getOwnerVehicleDetailService(auth, vehicleId);
    return { vehicleId, verificationStatus: detail.verificationStatus, documents: detail.documents };
}

export async function getOwnerVehicleVerificationStatusService(auth, vehicleIdInput) {
    const detail = await getOwnerVehicleDetailService(auth, vehicleIdInput);
    return {
        vehicleId: detail.id,
        verificationStatus: detail.verificationStatus,
        missingRequiredDocuments: detail.documents.filter((item) => !item.fileUrl).map((item) => item.documentTypeId),
    };
}

export async function getOwnerActivityVehicles(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const { page, pageSize } = normalizePagination(query);
    const listed = await listOwnerVehicles(ownerId, { page, pageSize, search: query.search || "", status: query.status || "all" });
    return {
        items: listed.items.map((item) => ({
            id: Number(item.vehicle_id),
            plateNumber: item.license_plate,
            vehicleType: item.type_name,
            brand: item.brand,
            model: item.model,
            year: item.year ? Number(item.year) : null,
            status: item.status,
            verificationStatus: item.verification_status,
            location: item.current_long && item.current_lat ? { lng: Number(item.current_long), lat: Number(item.current_lat) } : null,
        })),
        page,
        pageSize,
        total: listed.total,
    };
}

export async function getOwnerActivityVehicleLocations(auth, query) {
    const vehicles = await getOwnerActivityVehicles(auth, { page: 1, pageSize: 200, status: query.status || "all" });
    return { items: vehicles.items.filter((item) => Boolean(item.location)) };
}

export async function getOwnerVehicleAvailability(auth, vehicleIdInput, query) {
    const ownerId = ensureOwnerAuth(auth);
    const vehicleId = Number(vehicleIdInput);
    const vehicle = await findOwnerVehicleById(ownerId, vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
    const from = ensureValidDate(query.from, "from");
    const to = ensureValidDate(query.to, "to");
    const maintenanceBlocks = await listOwnerVehicleMaintenanceForCalendar(ownerId, vehicleId, { from, to });
    const rentalBlocks = await listVehicleRentalBookingBlocks(vehicleId, { from, to });
    const blocks = [
        ...maintenanceBlocks.map((item) => ({
            id: Number(item.block_id),
            type: "maintenance",
            startAt: item.start_at,
            endAt: item.end_at,
            note: item.note || "",
            deletable: true,
        })),
        ...rentalBlocks.map((item) => ({
            id: Number(item.block_id),
            type: "booked",
            startAt: item.start_at,
            endAt: item.end_at,
            note: item.note || "",
            deletable: false,
        })),
    ].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    return { vehicleId, view: query.view || "week", from: query.from || null, to: query.to || null, blocks };
}

export async function createOwnerAvailabilityBlock(auth, vehicleIdInput, payload) {
    const ownerId = ensureOwnerAuth(auth);
    const vehicleId = Number(vehicleIdInput);
    const vehicle = await findOwnerVehicleById(ownerId, vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
    const startAt = ensureValidDate(payload.startAt, "startAt");
    const endAt = ensureValidDate(payload.endAt, "endAt");
    if (new Date(endAt) <= new Date(startAt)) throw new AppError("Invalid time range.", 422, "VALIDATION_ERROR");
    const id = await createMaintenance({
        vehicle_id: vehicleId,
        description: payload.note || "Bảo trì xe",
        start_date: startAt,
        end_date: endAt,
        cost: 0,
        status: "scheduled",
    });
    return { id, type: "maintenance", startAt, endAt, note: payload.note || "Bảo trì xe", deletable: true };
}

export async function toggleVehicleOperationStatus(auth, vehicleIdInput) {
    const ownerId = ensureOwnerAuth(auth);
    const vehicleId = Number(vehicleIdInput);
    const vehicle = await findOwnerVehicleById(ownerId, vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
    if (vehicle.is_verified !== 1) throw new AppError("Only verified vehicles can be toggled.", 409, "VEHICLE_NOT_VERIFIED");
    const newStatus = vehicle.status === "available" ? "unavailable" : "available";
    const updated = await updateVehicleOperationStatus(ownerId, vehicleId, newStatus);
    if (!updated) throw new AppError("Could not update vehicle status.", 500, "UPDATE_FAILED");
    return { vehicleId, status: newStatus };
}

export async function deleteOwnerAvailabilityBlock(auth, vehicleIdInput, blockIdInput) {
    const ownerId = ensureOwnerAuth(auth);
    const vehicleId = Number(vehicleIdInput);
    const blockId = Number(blockIdInput);
    const ok = await deleteOwnerVehicleMaintenance(ownerId, vehicleId, blockId);
    if (!ok) throw new AppError("Maintenance record not found.", 404, "AVAILABILITY_BLOCK_NOT_FOUND");
    return true;
}

export async function getOwnerTimeline(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const vehicles = await listOwnerVehiclesSimple(ownerId);
    const from = ensureValidDate(query.from, "from");
    const to = ensureValidDate(query.to, "to");
    const items = [];
    for (const vehicle of vehicles) {
        if (query.status && query.status !== "all" && vehicle.status !== query.status) continue;
        const vehicleId = Number(vehicle.vehicle_id);
        const maintenanceBlocks = await listOwnerVehicleMaintenanceForCalendar(ownerId, vehicleId, { from, to });
        const rentalBlocks = await listVehicleRentalBookingBlocks(vehicleId, { from, to });
        const blocks = [
            ...maintenanceBlocks.map((b) => ({
                id: Number(b.block_id),
                type: "maintenance",
                startAt: b.start_at,
                endAt: b.end_at,
                note: b.note || "",
            })),
            ...rentalBlocks.map((b) => ({
                id: Number(b.block_id),
                type: "booked",
                startAt: b.start_at,
                endAt: b.end_at,
                note: b.note || "",
            })),
        ].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
        items.push({
            vehicleId,
            plateNumber: vehicle.license_plate,
            displayName: `${vehicle.brand} ${vehicle.model} ${vehicle.year || ""}`.trim(),
            status: vehicle.status,
            blocks,
        });
    }
    return { from: query.from, to: query.to, items };
}

function mapMaintenanceRow(row) {
    return {
        id: Number(row.maintenance_id),
        vehicleId: Number(row.vehicle_id),
        description: row.description,
        startDate: row.start_date,
        endDate: row.end_date,
        cost: Number(row.cost || 0),
        status: row.status,
        note: "",
        createdAt: row.created_at,
        vehicle: {
            id: Number(row.vehicle_id),
            plateNumber: row.license_plate,
            displayName: `${row.brand} ${row.model} ${row.year || ""}`.trim(),
        },
    };
}

export async function getOwnerMaintenanceVehicles(auth) {
    const ownerId = ensureOwnerAuth(auth);
    const items = await listOwnerVehiclesSimple(ownerId);
    return {
        items: items.map((item) => ({
            id: Number(item.vehicle_id),
            plateNumber: item.license_plate,
            displayName: `${item.brand} ${item.model} ${item.year || ""}`.trim(),
            usageStatus: item.status,
        })),
    };
}

export async function listOwnerMaintenance(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const { page, pageSize } = normalizePagination(query);
    const listed = await listOwnerMaintenanceRecords(ownerId, {
        search: query.search || "",
        vehicleId: query.vehicleId,
        status: query.status,
        dateFrom: ensureValidDate(query.dateFrom, "dateFrom"),
        dateTo: ensureValidDate(query.dateTo, "dateTo"),
        page,
        pageSize,
    });
    return { items: listed.items.map(mapMaintenanceRow), page, pageSize, total: listed.total };
}

export async function getOwnerMaintenanceDetail(auth, maintenanceIdInput) {
    const ownerId = ensureOwnerAuth(auth);
    const row = await findOwnerMaintenanceById(ownerId, Number(maintenanceIdInput));
    if (!row) throw new AppError("Maintenance record not found.", 404, "MAINTENANCE_NOT_FOUND");
    return mapMaintenanceRow(row);
}

export async function createOwnerMaintenance(auth, payload) {
    const ownerId = ensureOwnerAuth(auth);
    const vehicle = await findOwnerVehicleById(ownerId, Number(payload.vehicleId));
    if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
    const id = await createMaintenance({
        vehicle_id: Number(payload.vehicleId),
        description: payload.description,
        start_date: ensureValidDate(payload.startDate, "startDate"),
        end_date: ensureValidDate(payload.endDate, "endDate"),
        cost: Number(payload.cost || 0),
        status: payload.status || "scheduled",
    });
    return getOwnerMaintenanceDetail(auth, id);
}

export async function updateOwnerMaintenanceService(auth, maintenanceIdInput, payload) {
    const ownerId = ensureOwnerAuth(auth);
    const existing = await findOwnerMaintenanceById(ownerId, Number(maintenanceIdInput));
    if (!existing) throw new AppError("Maintenance record not found.", 404, "MAINTENANCE_NOT_FOUND");
    await updateMaintenance(Number(maintenanceIdInput), {
        description: payload.description || existing.description,
        start_date: ensureValidDate(payload.startDate || existing.start_date, "startDate"),
        end_date: ensureValidDate(payload.endDate || existing.end_date, "endDate"),
        cost: Number(payload.cost ?? existing.cost),
        status: payload.status || existing.status,
    });
    return getOwnerMaintenanceDetail(auth, maintenanceIdInput);
}

export async function deleteOwnerMaintenanceService(auth, maintenanceIdInput) {
    const ownerId = ensureOwnerAuth(auth);
    const existing = await findOwnerMaintenanceById(ownerId, Number(maintenanceIdInput));
    if (!existing) throw new AppError("Maintenance record not found.", 404, "MAINTENANCE_NOT_FOUND");
    await deleteMaintenance(Number(maintenanceIdInput));
    return true;
}

export async function getOwnerMaintenanceStats(auth, query) {
    const listed = await listOwnerMaintenance(auth, { ...query, page: 1, pageSize: 200 });
    const activeVehicleIds = new Set(listed.items.filter((item) => item.status === "in_progress").map((item) => item.vehicleId));
    const upcomingSchedules = listed.items.filter((item) => item.status === "scheduled").length;
    const totalMaintenanceCost = listed.items.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    return { activeVehiclesUnderMaintenance: activeVehicleIds.size, upcomingSchedules, totalMaintenanceCost };
}

function mapRentalListItem(row) {
    return {
        id: String(row.rental_id),
        vehicleId: String(row.vehicle_id || ""),
        orderCode: row.rental_code,
        customerName: `${row.firstname || ""} ${row.lastname || ""}`.trim(),
        vehicleName: `${row.brand || ""} ${row.model || ""} ${row.year || ""}`.trim(),
        plateNumber: row.license_plate || "",
        servicePackageName: row.package_name || "",
        serviceType: String(row.service_type || ""),
        startAt: row.start_datetime,
        endAt: row.end_datetime,
        totalAmount: Number(row.total_price || 0) - Number(row.deposit_amount || 0),
        paymentStatus: row.payment_status,
        orderStatus: BOOKING_STATUS_MAP[row.status] || row.status,
    };
}

function validateBookingTransition(currentStatus, nextStatus) {
    const allowed = BOOKING_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
        throw new AppError("Invalid booking status transition.", 409, "INVALID_STATUS_TRANSITION");
    }
}

export async function listOwnerBookings(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const { page, pageSize } = normalizePagination(query);
    const backendStatus = query.status && query.status !== "all" ? BOOKING_STATUS_REVERSE_MAP[query.status] : null;
    const listed = await listOwnerRentals(ownerId, {
        search: query.search || "",
        status: backendStatus || "all",
        serviceType: query.serviceType || "all",
        vehicleId: query.vehicleId || "all",
        dateFrom: ensureValidDate(query.dateFrom, "dateFrom"),
        dateTo: ensureValidDate(query.dateTo, "dateTo"),
        page,
        pageSize,
    });
    return { items: listed.items.map(mapRentalListItem), page, pageSize, total: listed.total };
}

export async function getOwnerBookingDetail(auth, rentalIdInput) {
    const ownerId = ensureOwnerAuth(auth);
    const rentalId = Number(rentalIdInput);
    const rental = await findOwnerRentalById(ownerId, rentalId);
    if (!rental) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    const [contracts, historyRows] = await Promise.all([
        listContractsByOwner(ownerId, rentalId),
        listRentalStatusHistory(rentalId),
    ]);
    return {
        id: String(rental.rental_id),
        orderCode: rental.rental_code,
        orderStatus: BOOKING_STATUS_MAP[rental.status] || rental.status,
        paymentStatus: rental.payment_status,
        paymentMethod: rental.payment_type === null ? null : (rental.payment_type === 2 ? 'Ví ThueXe' : 'Tiền mặt'),
        customer: { fullName: `${rental.firstname || ""} ${rental.lastname || ""}`.trim(), phoneNumber: rental.customer_phone || "" },
        vehicle: {
            id: String(rental.vehicle_id || ""),
            plateNumber: rental.license_plate || "",
            displayName: `${rental.brand || ""} ${rental.model || ""} ${rental.year || ""}`.trim(),
        },
        servicePackage: {
            name: rental.package_name || "",
            serviceType: String(rental.service_type || ""),
            includedDistanceKm: Number(rental.distance_limit_km || 0),
        },
        pickup: { at: rental.start_datetime, address: rental.pickup_address },
        dropoff: { at: rental.actual_end_datetime || rental.end_datetime, address: rental.dropoff_address },
        cancelNote: rental.cancel_reason || null,
        costBreakdown: {
            totalAmount: Number(rental.total_price || 0) - Number(rental.deposit_amount || 0),
            basePrice: Number(rental.base_price || 0),
            depositAmount: Number(rental.deposit_amount || 0),
            extraTimeFee: Number(rental.extra_time_fee || 0),
            extraDistanceFee: Number(rental.extra_distance_fee || 0),
            deliveryFee: 0,
            discount: 0,
        },
        statusHistory: historyRows.map((row) => ({
            status: BOOKING_STATUS_MAP[row.status] || row.status,
            at: row.created_at,
            note: row.note || null,
        })),
        contracts: contracts.map((item) => ({
            id: String(item.contract_id),
            bookingId: String(item.rental_id),
            contractNumber: item.contract_no,
            status: item.status,
            signedAt: item.signed_at,
            fileUrl: item.contract_url,
        })),
    };
}

export async function updateOwnerBookingStatus(auth, rentalIdInput, payload) {
    const ownerId = ensureOwnerAuth(auth);
    const rentalId = Number(rentalIdInput);
    const rental = await findOwnerRentalById(ownerId, rentalId);
    if (!rental) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    const current = BOOKING_STATUS_MAP[rental.status] || rental.status;
    const next = String(payload.nextStatus || "").trim();
    validateBookingTransition(current, next);
    const mapped = BOOKING_STATUS_REVERSE_MAP[next];
    await updateOwnerRentalStatus(rentalId, mapped, next === "canceled" ? (payload.cancelNote || null) : null);
    return getOwnerBookingDetail(auth, rentalId);
}

export async function listOwnerBookingContracts(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const items = await listContractsByOwner(ownerId, query.bookingId ? Number(query.bookingId) : null);
    return {
        items: items.map((item) => ({
            id: String(item.contract_id),
            bookingId: String(item.rental_id),
            contractNumber: item.contract_no,
            status: item.status,
            signedAt: item.signed_at,
            fileUrl: item.contract_url,
        })),
        total: items.length,
    };
}

export async function getOwnerBookingContractDetail(auth, contractIdInput) {
    const ownerId = ensureOwnerAuth(auth);
    const item = await findContractByOwner(ownerId, Number(contractIdInput));
    if (!item) throw new AppError("Contract not found.", 404, "CONTRACT_NOT_FOUND");
    return {
        id: String(item.contract_id),
        bookingId: String(item.rental_id),
        contractNumber: item.contract_no,
        status: item.status,
        signedAt: item.signed_at,
        fileUrl: item.contract_url,
    };
}

export async function getOwnerRevenueSummary(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const [totals, wallet, withdrawalTotals, monthlyTrend] = await Promise.all([
        getOwnerRevenueTotals(ownerId, {
            dateFrom: ensureValidDate(query.dateFrom, "dateFrom"),
            dateTo: ensureValidDate(query.dateTo, "dateTo"),
        }),
        ensureOwnerWallet(ownerId),
        getOwnerWithdrawalTotals(ownerId),
        getOwnerMonthlyRevenueTrend(ownerId),
    ]);
    return {
        totalRevenue: Number(totals.total_completed_revenue || 0),
        monthRevenue: Number(totals.total_completed_revenue || 0),
        pendingRevenue: Number(totals.pending_revenue || 0),
        walletBalance: Number(wallet.balance || 0),
        totalBookings: Number(totals.total_bookings || 0),
        pendingWithdrawal: Number(withdrawalTotals.pending_total || 0),
        processingWithdrawal: Number(withdrawalTotals.processing_total || 0),
        monthlyTrend,
    };
}

export async function getOwnerRevenueByVehicleService(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const { page, pageSize } = normalizePagination(query);
    const listed = await getOwnerRevenueByVehicle(ownerId, { page, pageSize, search: query.search || "" });
    return {
        items: listed.items.map((item) => ({
            vehicleId: String(item.vehicle_id),
            vehicleName: `${item.brand} ${item.model} ${item.year || ""}`.trim(),
            plateNumber: item.license_plate,
            grossRevenue: Number(item.revenue || 0),
            netRevenue: Number(item.revenue || 0),
            totalBookings: Number(item.total_bookings || 0),
        })),
        page,
        pageSize,
        total: listed.total,
    };
}

export async function getOwnerRevenueWallet(auth) {
    const ownerId = ensureOwnerAuth(auth);
    const owner = await findOwnerById(ownerId);
    const wallet = await ensureOwnerWallet(ownerId);
    return {
        walletId: Number(wallet.wallet_id),
        currentBalance: Number(wallet.balance || 0),
        availableBalance: Number(wallet.balance || 0),
        pendingWithdrawal: 0,
        minimumWithdrawal: 100000,
        defaultBankAccount: {
            bankName: owner?.bank_name || "",
            bankAccountNumber: owner?.bank_account || "",
            bankCode: owner?.bank_code || "",
        },
    };
}

export async function listOwnerRevenueLedger(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const { page, pageSize } = normalizePagination(query);
    const listed = await listOwnerWalletLedger(ownerId, { page, pageSize });
    return {
        items: listed.items.map((item) => ({
            id: String(item.ledger_id),
            transactionCode: `${item.ledger_id}`,
            transactionType: item.entry_type,
            amount: Number(item.amount || 0),
            direction: item.direction,
            status: "success",
            createdAt: item.created_at,
            description: item.description || "",
        })),
        page,
        pageSize,
        total: listed.total,
    };
}

export async function listOwnerRevenuePayments(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const { page, pageSize } = normalizePagination(query);
    const listed = await listOwnerPayments(ownerId, { page, pageSize });
    return {
        items: listed.items.map((item) => ({
            id: String(item.payment_id),
            paymentCode: item.payment_code,
            method: item.gateway_name || "wallet",
            amount: Number(item.amount || 0),
            status: item.status,
            createdAt: item.created_at,
            description: item.description || "",
        })),
        page,
        pageSize,
        total: listed.total,
    };
}

export async function listOwnerRevenueWithdrawals(auth, query) {
    const ownerId = ensureOwnerAuth(auth);
    const { page, pageSize } = normalizePagination(query);
    const listed = await listOwnerWithdrawals(ownerId, { page, pageSize });
    return {
        items: listed.items.map((item) => ({
            id: String(item.withdrawal_id),
            requestCode: `WD-${item.withdrawal_id}`,
            amount: Number(item.amount || 0),
            status: item.status,
            createdAt: item.requested_at,
        })),
        page,
        pageSize,
        total: listed.total,
    };
}

export async function createOwnerRevenueTopup(auth, payload, idempotencyKey = "") {
    const ownerId = ensureOwnerAuth(auth);
    const amount = Number(payload.amount || 0);
    if (!(amount > 0)) throw new AppError("Invalid amount.", 422, "INVALID_AMOUNT");
    const gatewayName = String(payload.method || "manual").toLowerCase();
    const isMomo = gatewayName === "momo";
    const isSepay = gatewayName === "sepay";
    const key = idempotencyKey || "";
    if (key) {
        const cached = consumeCachedResponse(ownerId, key);
        if (cached) return cached;
        const inflight = getInflightPromise(ownerId, key);
        if (inflight) return inflight;
    }
    const promise = withUserMutex(ownerId, async () => runInTx(async (conn) => {
        const wallet = await ensureOwnerWallet(ownerId, conn);
        const locked = await findWalletByIdForUpdate(wallet.wallet_id, conn);
        if (!locked || Number(locked.status) !== 1) throw new AppError("Wallet disabled.", 409, "WALLET_DISABLED");
        const thePaymentCode = buildPaymentCode("TOPUP");

        if (isMomo) {
            // Tạo payment pending — chưa cộng tiền ví, chờ IPN xác nhận
            const paymentId = await createPayment({
                payment_code: thePaymentCode,
                payer_wallet_id: locked.wallet_id,
                owner_id: ownerId,
                service_domain: 2,
                amount,
                currency_id: Number(locked.currency_id),
                status: "pending",
                gateway_name: "momo",
                gateway_transaction_ref: null,
                description: "Owner wallet topup via MoMo",
            }, conn);
            const momoResult = await createMomoPayment({
                paymentCode: thePaymentCode,
                amount,
                orderInfo: "Nạp tiền ví Chủ xe ThueXe",
                ipnUrl: process.env.MOMO_IPN_URL || "",
                redirectUrl: process.env.MOMO_REDIRECT_URL || "",
                extraData: "",
            });
            return {
                paymentCode: thePaymentCode,
                paymentId,
                status: "pending",
                paymentUrl: momoResult.payUrl,
                walletBalanceAfter: Number(locked.balance),
            };
        }

        if (isSepay) {
            const paymentId = await createPayment({
                payment_code: thePaymentCode,
                payer_wallet_id: locked.wallet_id,
                owner_id: ownerId,
                service_domain: 2,
                amount,
                currency_id: Number(locked.currency_id),
                status: "pending",
                gateway_name: "sepay",
                gateway_transaction_ref: null,
                description: "Owner wallet topup via SePay",
            }, conn);
            const relayUrl = `${process.env.SERVER_BASE_URL || "http://localhost:8000"}/api/payments/checkout/sepay?code=${thePaymentCode}`;
            return {
                paymentCode: thePaymentCode,
                paymentId,
                status: "pending",
                paymentUrl: relayUrl,
                walletBalanceAfter: Number(locked.balance),
            };
        }

        // Thanh toán thủ công / chuyển khoản: cộng tiền ngay
        const nextBalance = Number((Number(locked.balance) + amount).toFixed(2));
        const paymentId = await createPayment({
            payment_code: thePaymentCode,
            payer_wallet_id: locked.wallet_id,
            owner_id: ownerId,
            service_domain: 2,
            amount,
            currency_id: Number(locked.currency_id),
            status: "paid",
            gateway_name: payload.method || "manual",
            gateway_transaction_ref: payload.gatewayRef || null,
            description: "Owner wallet topup",
        }, conn);
        await updateWalletBalance(locked.wallet_id, nextBalance, conn);
        await createWalletLedger({
            wallet_id: locked.wallet_id,
            payment_id: paymentId,
            amount,
            balance_after: nextBalance,
            direction: "credit",
            entry_type: "topup",
            source_type: "funding",
            source_id: paymentId,
            description: "Owner wallet topup",
        }, conn);
        return { paymentCode: thePaymentCode, paymentId, status: "success", paymentUrl: null, walletBalanceAfter: nextBalance };
    }));
    if (key) rememberInflightPromise(ownerId, key, promise);
    try {
        const result = await promise;
        if (key) rememberIdempotentResponse(ownerId, key, result);
        return result;
    } finally {
        if (key) clearInflightPromise(ownerId, key);
    }
}

export async function processOwnerMomoTopupIpn({ orderId, resultCode, transId, message }) {
    return runInTx(async (conn) => {
        const payment = await findPaymentByCodeForUpdate(orderId, conn);
        if (!payment || Number(payment.actor_type) !== 2) return { ok: true, skipped: true };

        const prevStatus = String(payment.status || "").toLowerCase();
        const newStatus = mapMomoResultCode(resultCode);
        if (prevStatus === newStatus) return { ok: true, unchanged: true };

        await updatePaymentStatus(Number(payment.payment_id), newStatus, conn);

        if (newStatus === "paid" && prevStatus !== "paid") {
            const wallet = await findWalletByIdForUpdate(Number(payment.payer_wallet_id), conn);
            if (wallet && Number(wallet.status) === 1) {
                const nextBalance = Number((Number(wallet.balance) + Number(payment.amount)).toFixed(2));
                await updateWalletBalance(Number(wallet.wallet_id), nextBalance, conn);
                await createWalletLedger({
                    wallet_id: Number(wallet.wallet_id),
                    payment_id: Number(payment.payment_id),
                    amount: Number(payment.amount),
                    balance_after: nextBalance,
                    direction: "credit",
                    entry_type: "topup",
                    source_type: "gateway_payment",
                    source_id: Number(payment.payment_id),
                    description: "Owner wallet topup via MoMo",
                }, conn);
            }
        }

        return { ok: true, payment_id: Number(payment.payment_id), status: newStatus };
    });
}

export async function confirmOwnerGatewayTopup(payment, status) {
    return runInTx(async (conn) => {
        const lockedPayment = await findPaymentByCodeForUpdate(payment.payment_code, conn);
        if (!lockedPayment || Number(lockedPayment.actor_type) !== 2) return { ok: true, skipped: true };

        const prevStatus = String(lockedPayment.status || "").toLowerCase();
        if (prevStatus === status) return { ok: true, unchanged: true };

        await updatePaymentStatus(Number(lockedPayment.payment_id), status, conn);

        let walletAfter = null;
        if (status === "paid" && prevStatus !== "paid") {
            const wallet = await findWalletByIdForUpdate(Number(lockedPayment.payer_wallet_id), conn);
            if (wallet && Number(wallet.status) === 1) {
                const nextBalance = Number((Number(wallet.balance) + Number(lockedPayment.amount)).toFixed(2));
                await updateWalletBalance(Number(wallet.wallet_id), nextBalance, conn);
                await createWalletLedger({
                    wallet_id: Number(wallet.wallet_id),
                    payment_id: Number(lockedPayment.payment_id),
                    amount: Number(lockedPayment.amount),
                    balance_after: nextBalance,
                    direction: "credit",
                    entry_type: "topup",
                    source_type: "gateway_payment",
                    source_id: Number(lockedPayment.payment_id),
                    description: `Owner wallet topup via ${lockedPayment.gateway_name || "gateway"}`,
                }, conn);
                walletAfter = { wallet_id: Number(wallet.wallet_id), balance: nextBalance };
            }
        }

        const result = { ok: true, payment_id: Number(lockedPayment.payment_id), status };

        if (walletAfter) {
            publishRealtimeEvent("wallet.updated", {
                wallet_id: walletAfter.wallet_id,
                balance: walletAfter.balance,
                updated_at: new Date().toISOString(),
            }, { targetUserIds: [Number(lockedPayment.actor_id)] });
        }

        return result;
    });
}

export async function createOwnerRevenueWithdrawal(auth, payload, idempotencyKey = "") {
    const ownerId = ensureOwnerAuth(auth);
    const amount = Number(payload.amount || 0);
    if (!(amount > 0)) throw new AppError("Invalid amount.", 422, "INVALID_AMOUNT");
    const key = idempotencyKey || "";
    if (key) {
        const cached = consumeCachedResponse(ownerId, key);
        if (cached) return cached;
        const inflight = getInflightPromise(ownerId, key);
        if (inflight) return inflight;
    }
    const promise = withUserMutex(ownerId, async () => runInTx(async (conn) => {
        const wallet = await ensureOwnerWallet(ownerId, conn);
        const locked = await findWalletByIdForUpdate(wallet.wallet_id, conn);
        if (!locked || Number(locked.status) !== 1) throw new AppError("Wallet disabled.", 409, "WALLET_DISABLED");
        const required = await calcOwnerRequiredBalance(ownerId, conn);
        const freeBalance = Number(locked.balance) - required;
        if (freeBalance < amount) throw new AppError(`Số dư khả dụng không đủ. Số dư: ${Number(locked.balance)} VND, đang giữ cọc: ${required} VND, có thể rút: ${Math.max(0, freeBalance)} VND.`, 409, "OWNER_INSUFFICIENT_FREE_BALANCE");
        const withdrawalId = await createWithdrawalRequest(Number(locked.wallet_id), amount, payload.note || null, conn);
        return { id: String(withdrawalId), requestCode: `WD-${withdrawalId}`, amount, status: "pending" };
    }));
    if (key) rememberInflightPromise(ownerId, key, promise);
    try {
        const result = await promise;
        if (key) rememberIdempotentResponse(ownerId, key, result);
        return result;
    } finally {
        if (key) clearInflightPromise(ownerId, key);
    }
}

export async function updateVehiclePhotoService(auth, vehicleIdInput, photoFile) {
    const ownerId = ensureOwnerAuth(auth);
    const vehicleId = Number(vehicleIdInput);
    const vehicle = await findOwnerVehicleById(ownerId, vehicleId);
    if (!vehicle) throw new AppError("Vehicle not found.", 404, "VEHICLE_NOT_FOUND");
    if (!photoFile || !photoFile.buffer) throw new AppError("No photo file provided.", 422, "PHOTO_REQUIRED");

    const uploaded = await uploadBufferToCloudinary(photoFile.buffer, {
        folder: `thuexe/vehicles/${vehicleId}/photo`,
        resource_type: "image",
    });
    await updateVehiclePhotoUrl(vehicleId, uploaded.secure_url);
    return { photoUrl: uploaded.secure_url };
}

export const __ownerTestUtils = {
    normalizeIdentifier,
    toSqlDate,
    ensureStrongPassword,
    validateBookingTransition,
    BOOKING_TRANSITIONS,
};
