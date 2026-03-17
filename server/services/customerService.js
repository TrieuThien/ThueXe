import crypto from "crypto";
import sqldb from "../config/sqldatabase.js";
import { deleteCloudinaryImage, uploadBufferToCloudinary } from "../config/cloudinary.js";
import {
    countCustomers,
    findCustomerAccountById,
    findCustomerById,
    findCustomerBookings,
    findCustomerDocuments,
    findCustomerReviews,
    findCustomerTransactions,
    findCustomers,
    findExistingAccountByEmail,
    findExistingAccountByPhone,
    insertCustomer,
    referalCodeExists,
    routeExists,
    summarizeCustomers,
    updateCustomerAccountStatus as persistCustomerAccountStatus,
    updateCustomerPersonalInfo as persistCustomerPersonalInfo,
} from "../repositories/customerRepository.js";
import AppError from "../utils/appError.js";
import { hashPassword } from "../utils/password.js";

const CUSTOMER_IMAGE_FOLDER = "thuexe/customers";
const DEFAULT_COUNTRY = "Vietnam";
const DEFAULT_COUNTRY_CODE = "vn";
const DEFAULT_COUNTRY_DIAL_CODE = "+84";
const DEFAULT_DISP_LANG = "vn";
const ALLOWED_DOCUMENT_STATUS = new Set([
    "no_documents",
    "pending",
    "failed",
    "expired",
    "approved",
]);
const SORT_BY_WHITELIST = new Set([
    "account_create_date",
    "firstname",
    "user_rating",
    "wallet_amount",
    "user_id",
]);
const BOOKING_STATUS_LABELS = {
    0: "Chờ xử lý",
    1: "Đang chạy",
    2: "Khách hủy",
    3: "Hoàn thành",
    4: "Tài xế hủy",
    5: "Admin hủy",
    6: "Tài xế đã tới",
};
const PAYMENT_TYPE_LABELS = {
    1: "Tiền mặt",
    2: "Ví",
    3: "Thẻ",
    4: "POS",
};
const DOCUMENT_STATUS_LABELS = {
    0: "Chờ duyệt",
    1: "Không đạt",
    2: "Hết hạn",
    3: "Đã duyệt",
};
const WALLET_TRANSACTION_TYPE_LABELS = {
    0: "Nạp ví từ người dùng",
    1: "Nạp ví từ admin",
    2: "Ghi có thu nhập",
    3: "Ghi nợ thu nhập",
};

function normalizeText(value) {
    if (value === undefined || value === null) {
        return null;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function normalizeEmail(email) {
    const normalized = normalizeText(email);
    return normalized ? normalized.toLowerCase() : null;
}

function normalizeCountryCode(value) {
    const normalized = normalizeText(value);
    return normalized ? normalized.toLowerCase() : null;
}

function normalizeCountryDialCode(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
        return null;
    }

    const digits = normalized.replace(/\D/g, "");
    return digits ? `+${digits}` : null;
}

function normalizeBooleanFlag(value, defaultValue = 0) {
    if (value === undefined || value === null || value === "") {
        return defaultValue;
    }

    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }

    const normalized = String(value).trim().toLowerCase();

    if (["1", "true", "yes", "on"].includes(normalized)) {
        return 1;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
        return 0;
    }

    return defaultValue;
}

function normalizeStrictBooleanFlag(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }

    const normalized = String(value).trim().toLowerCase();

    if (["1", "true", "yes", "on"].includes(normalized)) {
        return 1;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
        return 0;
    }

    return null;
}

function normalizeOptionalInteger(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    return Number(value);
}

function normalizeQueryInteger(value, fallback) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    return Number(value);
}

function buildDocumentSummary(documentCounts) {
    return {
        total: documentCounts.total,
        pending: documentCounts.pending,
        failed: documentCounts.failed,
        expired: documentCounts.expired,
        approved: documentCounts.approved,
    };
}

function resolveBookingStatusLabel(status) {
    return BOOKING_STATUS_LABELS[status] || "Không xác định";
}

function resolvePaymentTypeLabel(paymentType) {
    if (paymentType === null || paymentType === undefined) {
        return "Chưa xác định";
    }

    return PAYMENT_TYPE_LABELS[paymentType] || "Khác";
}

function resolveDocumentStatusLabel(status) {
    return DOCUMENT_STATUS_LABELS[status] || "Không xác định";
}

function resolveTransactionTypeLabel(sourceType, typeCode) {
    if (sourceType === "wallet_fund") {
        return "Nạp ví thủ công";
    }

    return WALLET_TRANSACTION_TYPE_LABELS[typeCode] || "Giao dịch ví";
}

function normalizeCustomerIdOrThrow(value) {
    const userId = normalizeOptionalInteger(value);

    if (!Number.isInteger(userId) || userId < 1) {
        throw new AppError("Invalid customer id.", 422, "INVALID_CUSTOMER_ID");
    }

    return userId;
}

function serializeCustomer(customer) {
    return {
        user_id: customer.user_id,
        firstname: customer.firstname,
        lastname: customer.lastname,
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        country: customer.country,
        country_code: customer.country_code,
        country_dial_code: customer.country_dial_code,
        route_id: customer.route_id,
        route_name: customer.route_name,
        user_rating: customer.user_rating,
        account_active: customer.account_active,
        is_activated: customer.is_activated,
        account_deleted: customer.account_deleted,
        wallet_amount: customer.wallet_amount,
        photo_file: customer.photo_file,
        account_create_date: customer.account_create_date,
        document_summary: buildDocumentSummary(customer.document_counts),
        document_status: customer.document_status,
    };
}

function serializeCustomerTransaction(transaction) {
    return {
        id: transaction.row_key,
        source_id: transaction.source_id,
        source_type: transaction.source_type,
        reference_id: transaction.reference_id,
        booking_id: transaction.booking_id || null,
        amount: transaction.amount,
        currency_symbol: transaction.cur_symbol,
        currency_code: transaction.cur_code,
        wallet_balance: transaction.wallet_balance,
        description: transaction.description,
        type_code: transaction.type_code,
        type_label: resolveTransactionTypeLabel(transaction.source_type, transaction.type_code),
        actor_name: transaction.actor_name,
        transaction_date: transaction.transaction_date,
    };
}

function serializeCustomerBooking(booking) {
    return {
        id: booking.id,
        booking_code: booking.b_uuid,
        user_phone: booking.user_phone,
        driver_id: booking.driver_id || null,
        driver_name: booking.driver_name,
        driver_phone: booking.driver_phone,
        pickup_datetime: booking.pickup_datetime,
        pickup_address: booking.pickup_address,
        dropoff_datetime: booking.dropoff_datetime,
        dropoff_address: booking.dropoff_address,
        route_id: booking.route_id || null,
        route_name: booking.route_name,
        ride_id: booking.ride_id || null,
        ride_type: booking.ride_type,
        scheduled: booking.scheduled,
        payment_type: booking.payment_type,
        payment_type_label: resolvePaymentTypeLabel(booking.payment_type),
        status: booking.status,
        status_label: resolveBookingStatusLabel(booking.status),
        estimated_cost: booking.estimated_cost,
        actual_cost: booking.actual_cost,
        paid_amount: booking.paid_amount,
        haspaid: booking.haspaid,
        cancel_comment: booking.cancel_comment,
        transaction_id: booking.transaction_id || null,
        date_created: booking.date_created,
        date_started: booking.date_started,
        date_completed: booking.date_completed,
        num_seats: booking.num_seats,
    };
}

function serializeCustomerReview(review) {
    return {
        id: review.review_key,
        review_id: review.review_id,
        booking_id: review.booking_id || null,
        direction: review.review_direction,
        direction_label: review.review_direction === "received" ? "Được đánh giá" : "Đã đánh giá",
        counterparty_name: review.counterparty_name,
        rating: review.rating,
        comment: review.comment,
        booking_date: review.booking_date,
    };
}

function serializeCustomerDocument(document) {
    return {
        id: document.id,
        doc_id: document.doc_id || null,
        title: document.document_title,
        description: document.document_description,
        id_number_title: document.document_id_number_title,
        id_number: document.document_id_number,
        can_edit: document.can_edit,
        expiry_date: document.expiry_date,
        image_url: document.image_url,
        status: document.status,
        status_label: resolveDocumentStatusLabel(document.status),
        date_created: document.date_created,
        date_updated: document.date_updated,
    };
}

function normalizeCustomerFilters(query = {}) {
    const page = Math.max(normalizeQueryInteger(query.page, 1), 1);
    const limit = Math.min(Math.max(normalizeQueryInteger(query.limit, 10), 1), 100);
    const sortBy = SORT_BY_WHITELIST.has(query.sort_by)
        ? query.sort_by
        : "account_create_date";
    const sortOrder = String(query.sort_order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const search = normalizeText(query.search);
    const routeId = normalizeOptionalInteger(query.route_id);
    const ratingMin = normalizeOptionalInteger(query.rating_min);
    const ratingMax = normalizeOptionalInteger(query.rating_max);
    const documentStatus = normalizeText(query.document_status);

    return {
        page,
        limit,
        route_id: routeId,
        account_active:
            query.account_active === undefined
                ? undefined
                : normalizeBooleanFlag(query.account_active, 0),
        is_activated:
            query.is_activated === undefined
                ? undefined
                : normalizeBooleanFlag(query.is_activated, 0),
        document_status:
            documentStatus && ALLOWED_DOCUMENT_STATUS.has(documentStatus)
                ? documentStatus
                : undefined,
        rating_min: ratingMin,
        rating_max: ratingMax,
        date_from: normalizeText(query.date_from),
        date_to: normalizeText(query.date_to),
        search,
        sort_by: sortBy,
        sort_order: sortOrder,
    };
}

function generateReferalCodeCandidate(length = 10) {
    return crypto
        .randomBytes(length)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, length)
        .toUpperCase();
}

async function generateUniqueReferalCode() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = generateReferalCodeCandidate(10);
        if (candidate.length < 10) {
            continue;
        }

        const exists = await referalCodeExists(candidate);
        if (!exists) {
            return candidate;
        }
    }

    throw new AppError(
        "Unable to generate customer referral code.",
        500,
        "REFERAL_CODE_GENERATION_FAILED"
    );
}

async function uploadCustomerImage(file) {
    if (!file?.buffer) {
        return null;
    }

    try {
        const result = await uploadBufferToCloudinary(file.buffer, {
            folder: CUSTOMER_IMAGE_FOLDER,
            resource_type: "image",
        });

        return result.secure_url;
    } catch (error) {
        throw new AppError("Failed to upload customer image.", 502, "CUSTOMER_IMAGE_UPLOAD_FAILED");
    }
}

async function cleanupCustomerImage(imageUrl) {
    if (!imageUrl || !imageUrl.includes(`/${CUSTOMER_IMAGE_FOLDER}/`)) {
        return;
    }

    await deleteCloudinaryImage(imageUrl);
}

export async function createCustomer(payload, file) {
    const email = normalizeEmail(payload.email);
    const phone = normalizeText(payload.phone);
    const routeId = normalizeOptionalInteger(payload.route_id) ?? null;

    const [existingEmail, existingPhone, routeFound, referalCode, passwordHash] = await Promise.all([
        findExistingAccountByEmail(email),
        findExistingAccountByPhone(phone),
        routeId ? routeExists(routeId) : Promise.resolve(true),
        generateUniqueReferalCode(),
        hashPassword(payload.password),
    ]);

    if (email && existingEmail) {
        throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_USED");
    }

    if (existingPhone) {
        throw new AppError("Phone is already in use.", 409, "PHONE_ALREADY_USED");
    }

    if (!routeFound) {
        throw new AppError("Selected route does not exist.", 422, "ROUTE_NOT_FOUND");
    }

    const photoFile = await uploadCustomerImage(file);
    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();

        // Admin-created customers skip account_codes because this is not the self-register flow.
        const customerId = await insertCustomer(
            {
                firstname: normalizeText(payload.firstname),
                lastname: normalizeText(payload.lastname),
                email,
                phone,
                passwordHash,
                address: normalizeText(payload.address),
                country: normalizeText(payload.country) || DEFAULT_COUNTRY,
                referalCode,
                routeId,
                isActivated: normalizeBooleanFlag(payload.is_activated, 0),
                accountActive: normalizeBooleanFlag(payload.account_active, 0),
                photoFile,
                dispLang: DEFAULT_DISP_LANG,
                countryCode: normalizeCountryCode(payload.country_code) || DEFAULT_COUNTRY_CODE,
                countryDialCode:
                    normalizeCountryDialCode(payload.country_dial_code) || DEFAULT_COUNTRY_DIAL_CODE,
            },
            connection
        );

        await connection.commit();

        const customer = await findCustomerById(customerId);
        if (!customer) {
            throw new AppError("Customer created but could not be loaded.", 500, "CUSTOMER_READ_FAILED");
        }

        return {
            customer: serializeCustomer(customer),
        };
    } catch (error) {
        await connection.rollback();

        if (photoFile) {
            await cleanupCustomerImage(photoFile);
        }

        throw error;
    } finally {
        connection.release();
    }
}

export async function getCustomerList(query) {
    const filters = normalizeCustomerFilters(query);
    const [items, totalItems] = await Promise.all([
        findCustomers(filters),
        countCustomers(filters),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.limit);

    return {
        items: items.map(serializeCustomer),
        pagination: {
            page: filters.page,
            limit: filters.limit,
            totalPages,
            hasNextPage: totalPages > 0 && filters.page < totalPages,
            hasPrevPage: filters.page > 1,
        },
        filters,
        totalItems,
    };
}

export async function getCustomerSummary(query) {
    const filters = normalizeCustomerFilters(query);
    const summary = await summarizeCustomers(filters);

    return {
        ...summary,
        filters,
    };
}

export async function getCustomerDetail(userIdInput) {
    const userId = normalizeCustomerIdOrThrow(userIdInput);
    const customer = await findCustomerById(userId);

    if (!customer) {
        throw new AppError("Customer not found.", 404, "CUSTOMER_NOT_FOUND");
    }

    const [transactions, bookings, reviews, documents] = await Promise.all([
        findCustomerTransactions(userId),
        findCustomerBookings(userId),
        findCustomerReviews(userId),
        findCustomerDocuments(userId),
    ]);

    return {
        customer: serializeCustomer(customer),
        transactions: transactions.map(serializeCustomerTransaction),
        bookings: bookings.map(serializeCustomerBooking),
        reviews: reviews.map(serializeCustomerReview),
        documents: documents.map(serializeCustomerDocument),
    };
}

export async function updateCustomerAccountState(userIdInput, payload) {
    const userId = normalizeCustomerIdOrThrow(userIdInput);
    const payloadUserId =
        payload.user_id === undefined || payload.user_id === null || payload.user_id === ""
            ? null
            : normalizeCustomerIdOrThrow(payload.user_id);
    const accountActive = normalizeStrictBooleanFlag(payload.account_active);

    if (payloadUserId !== null && payloadUserId !== userId) {
        throw new AppError("user_id does not match the requested customer.", 422, "CUSTOMER_ID_MISMATCH");
    }

    if (![0, 1].includes(accountActive)) {
        throw new AppError("account_active must be 0 or 1.", 422, "INVALID_ACCOUNT_STATUS");
    }

    const customerAccount = await findCustomerAccountById(userId);

    if (!customerAccount) {
        throw new AppError("Customer not found.", 404, "CUSTOMER_NOT_FOUND");
    }

    if (customerAccount.account_active === accountActive) {
        throw new AppError(
            accountActive === 1
                ? "Customer account is already active."
                : "Customer account is already locked.",
            409,
            "INVALID_ACCOUNT_STATE_CHANGE"
        );
    }

    await persistCustomerAccountStatus({ userId, accountActive });

    const updatedCustomer = await findCustomerById(userId);

    return {
        customer: serializeCustomer(updatedCustomer),
        action: accountActive === 1 ? "unlocked" : "locked",
    };
}

export async function updateCustomerPersonalInformation(userIdInput, payload, file) {
    const userId = normalizeCustomerIdOrThrow(userIdInput);
    const email = normalizeEmail(payload.email);
    const phone = normalizeText(payload.phone);
    const routeId = normalizeOptionalInteger(payload.route_id) ?? null;
    const firstname = normalizeText(payload.firstname);
    const lastname = normalizeText(payload.lastname);
    const country = normalizeText(payload.country) || DEFAULT_COUNTRY;
    const countryCode = normalizeCountryCode(payload.country_code) || DEFAULT_COUNTRY_CODE;
    const countryDialCode =
        normalizeCountryDialCode(payload.country_dial_code) || DEFAULT_COUNTRY_DIAL_CODE;
    const address = normalizeText(payload.address);

    const [customerAccount, existingEmail, existingPhone, routeFound] = await Promise.all([
        findCustomerAccountById(userId),
        findExistingAccountByEmail(email, userId),
        findExistingAccountByPhone(phone, userId),
        routeId ? routeExists(routeId) : Promise.resolve(true),
    ]);

    if (!customerAccount) {
        throw new AppError("Customer not found.", 404, "CUSTOMER_NOT_FOUND");
    }

    const accountActive =
        payload.account_active === undefined || payload.account_active === null || payload.account_active === ""
            ? customerAccount.account_active
            : normalizeStrictBooleanFlag(payload.account_active);

    if (email && existingEmail) {
        throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_USED");
    }

    if (phone && existingPhone) {
        throw new AppError("Phone is already in use.", 409, "PHONE_ALREADY_USED");
    }

    if (!routeFound) {
        throw new AppError("Selected route does not exist.", 422, "ROUTE_NOT_FOUND");
    }

    if (![0, 1].includes(accountActive)) {
        throw new AppError("account_active must be 0 or 1.", 422, "INVALID_ACCOUNT_STATUS");
    }

    const previousPhotoFile = customerAccount.photo_file;
    const uploadedPhotoFile = file ? await uploadCustomerImage(file) : previousPhotoFile;

    try {
        await persistCustomerPersonalInfo({
            userId,
            firstname,
            lastname,
            email,
            phone,
            address,
            country,
            routeId,
            accountActive,
            photoFile: uploadedPhotoFile,
            countryCode,
            countryDialCode,
        });

        if (file && previousPhotoFile && previousPhotoFile !== uploadedPhotoFile) {
            try {
                await cleanupCustomerImage(previousPhotoFile);
            } catch {
                // Ignore cleanup failure because profile data has already been updated successfully.
            }
        }

        const updatedCustomer = await findCustomerById(userId);

        return {
            customer: serializeCustomer(updatedCustomer),
        };
    } catch (error) {
        if (file && uploadedPhotoFile && uploadedPhotoFile !== previousPhotoFile) {
            await cleanupCustomerImage(uploadedPhotoFile);
        }

        throw error;
    }
}
