import sqldb from "../config/sqldatabase.js";
import { deleteCloudinaryImage, uploadBufferToCloudinary } from "../config/cloudinary.js";
import {
    countStaff,
    findAdminPasswordById,
    findExistingAccountByEmail,
    findExistingAccountByPhone,
    findStaffDocuments,
    findStaff,
    findStaffAccountById,
    findStaffById,
    findStaffReviews,
    findStaffTransactions,
    insertStaff,
    routeExists,
    softDeleteStaffAccount as persistStaffSoftDelete,
    summarizeStaff,
    updateStaffPersonalInfo as persistStaffPersonalInfo,
} from "../repositories/staffRepository.js";
import AppError from "../utils/appError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const STAFF_IMAGE_FOLDER = "thuexe/staff";
const DEFAULT_COUNTRY = "Vietnam";
const DEFAULT_COUNTRY_CODE = "vn";
const DEFAULT_COUNTRY_DIAL_CODE = "+84";
const DEFAULT_DISP_LANG = "vn";
const SORT_BY_WHITELIST = new Set([
    "account_create_date",
    "firstname",
    "user_rating",
    "wallet_amount",
    "user_id",
]);

const ROLE_TO_ACCOUNT_TYPE = {
    dispatcher: 2,
    admin: 3,
};

const ACCOUNT_TYPE_TO_ROLE = {
    2: "dispatcher",
    3: "admin",
};
const STAFF_ROLES = new Set(["admin", "dispatcher"]);
const STAFF_DOCUMENT_STATUS_LABELS = {
    0: "Cho duyet",
    1: "Khong dat",
    2: "Het han",
    3: "Da duyet",
};
const WALLET_TRANSACTION_TYPE_LABELS = {
    0: "user wallet funding",
    1: "wallet funding admin",
    2: "Earnings wallet credit",
    3: "Earning wallet debit",
};

function assertAdminAuthOrThrow(auth) {
    if (!auth || auth.role !== "admin") {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
}

function assertStaffAuthOrThrow(auth) {
    if (!auth || !STAFF_ROLES.has(auth.role)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
}

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

function normalizeRole(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return ROLE_TO_ACCOUNT_TYPE[normalized] ? normalized : null;
}

function normalizeStaffIdOrThrow(value) {
    const userId = normalizeOptionalInteger(value);

    if (!Number.isInteger(userId) || userId < 1) {
        throw new AppError("Invalid staff id.", 422, "INVALID_STAFF_ID");
    }

    return userId;
}

function serializeStaff(staff) {
    const accountType = Number(staff.account_type || 0);

    return {
        user_id: staff.user_id,
        firstname: staff.firstname,
        lastname: staff.lastname,
        full_name: staff.full_name,
        email: staff.email,
        phone: staff.phone,
        address: staff.address,
        country: staff.country,
        country_code: staff.country_code,
        country_dial_code: staff.country_dial_code,
        route_id: staff.route_id,
        route_name: staff.route_name,
        user_rating: staff.user_rating,
        account_active: staff.account_active,
        is_activated: staff.is_activated,
        account_deleted: staff.account_deleted,
        wallet_amount: staff.wallet_amount,
        photo_file: staff.photo_file,
        account_create_date: staff.account_create_date,
        last_login_date: staff.last_login_date,
        account_type: accountType,
        role: ACCOUNT_TYPE_TO_ROLE[accountType] || "dispatcher",
    };
}

function normalizeStaffFilters(query = {}) {
    const page = Math.max(normalizeQueryInteger(query.page, 1), 1);
    const limit = Math.min(Math.max(normalizeQueryInteger(query.limit, 10), 1), 100);
    const sortBy = SORT_BY_WHITELIST.has(query.sort_by)
        ? query.sort_by
        : "account_create_date";
    const sortOrder = String(query.sort_order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    return {
        page,
        limit,
        route_id: normalizeOptionalInteger(query.route_id),
        active_today:
            query.active_today === undefined
                ? undefined
                : normalizeBooleanFlag(query.active_today, 0),
        rating_min: normalizeOptionalInteger(query.rating_min),
        rating_max: normalizeOptionalInteger(query.rating_max),
        date_from: normalizeText(query.date_from),
        date_to: normalizeText(query.date_to),
        search: normalizeText(query.search),
        sort_by: sortBy,
        sort_order: sortOrder,
    };
}

async function uploadStaffImage(file) {
    if (!file?.buffer) {
        return null;
    }

    try {
        const result = await uploadBufferToCloudinary(file.buffer, {
            folder: STAFF_IMAGE_FOLDER,
            resource_type: "image",
        });

        return result.secure_url;
    } catch {
        throw new AppError("Failed to upload staff image.", 502, "STAFF_IMAGE_UPLOAD_FAILED");
    }
}

async function cleanupStaffImage(imageUrl) {
    if (!imageUrl || !imageUrl.includes(`/${STAFF_IMAGE_FOLDER}/`)) {
        return;
    }

    await deleteCloudinaryImage(imageUrl);
}

export async function createStaff(payload, file) {
    const role = normalizeRole(payload.role);
    const accountType = ROLE_TO_ACCOUNT_TYPE[role];

    if (!accountType) {
        throw new AppError("Role must be one of admin or dispatcher.", 422, "INVALID_ROLE");
    }

    const email = normalizeEmail(payload.email);
    const phone = normalizeText(payload.phone);
    const routeId = normalizeOptionalInteger(payload.route_id) ?? null;

    const [existingEmail, existingPhone, routeFound, passwordHash] = await Promise.all([
        findExistingAccountByEmail(email),
        findExistingAccountByPhone(phone),
        routeId ? routeExists(routeId) : Promise.resolve(true),
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

    const photoFile = await uploadStaffImage(file);
    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();

        const staffId = await insertStaff(
            {
                firstname: normalizeText(payload.firstname),
                lastname: normalizeText(payload.lastname),
                email,
                phone,
                passwordHash,
                address: normalizeText(payload.address),
                country: normalizeText(payload.country) || DEFAULT_COUNTRY,
                routeId,
                accountType,
                isActivated: normalizeBooleanFlag(payload.is_activated, 1),
                accountActive: normalizeBooleanFlag(payload.account_active, 1),
                photoFile,
                dispLang: DEFAULT_DISP_LANG,
                countryCode: normalizeCountryCode(payload.country_code) || DEFAULT_COUNTRY_CODE,
                countryDialCode:
                    normalizeCountryDialCode(payload.country_dial_code) || DEFAULT_COUNTRY_DIAL_CODE,
            },
            connection
        );

        await connection.commit();

        const staff = await findStaffById(staffId);
        if (!staff) {
            throw new AppError("Staff created but could not be loaded.", 500, "STAFF_READ_FAILED");
        }

        return {
            staff: serializeStaff(staff),
        };
    } catch (error) {
        await connection.rollback();

        if (photoFile) {
            await cleanupStaffImage(photoFile);
        }

        throw error;
    } finally {
        connection.release();
    }
}

export async function getStaffList(query) {
    const filters = normalizeStaffFilters(query);
    const [items, totalItems] = await Promise.all([
        findStaff(filters),
        countStaff(filters),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.limit);

    return {
        items: items.map(serializeStaff),
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

export async function getStaffSummary(query) {
    const filters = normalizeStaffFilters(query);
    const summary = await summarizeStaff(filters);

    return {
        ...summary,
        filters,
    };
}

function serializeStaffTransaction(transaction) {
    return {
        id: transaction.row_key,
        transaction_id: transaction.reference_id,
        amount: transaction.amount,
        wallet_balance: transaction.wallet_balance,
        booking_id: transaction.booking_id || null,
        type: transaction.type_code,
        type_label: WALLET_TRANSACTION_TYPE_LABELS[transaction.type_code] || "wallet transaction",
        description: transaction.description,
        transaction_date: transaction.transaction_date,
    };
}

function serializeStaffReview(review) {
    return {
        id: review.id,
        reviewer_name: review.reviewer_name,
        booking_id: review.booking_id || null,
        rating: review.rating,
        comment: review.comment,
    };
}

function serializeStaffDocument(document) {
    return {
        id: document.id,
        doc_id: document.doc_id || null,
        title: document.title,
        id_number_title: document.id_number_title,
        id_number: document.id_number,
        expiry_date: document.expiry_date,
        image_url: document.image_url,
        status: document.status,
        status_label: STAFF_DOCUMENT_STATUS_LABELS[document.status] || "Khong xac dinh",
        date_created: document.date_created,
        date_updated: document.date_updated,
    };
}

export async function getStaffDetail(userIdInput) {
    const userId = normalizeStaffIdOrThrow(userIdInput);
    const staff = await findStaffById(userId);

    if (!staff) {
        throw new AppError("Staff not found.", 404, "STAFF_NOT_FOUND");
    }

    const [transactions, reviews, documents] = await Promise.all([
        findStaffTransactions(userId),
        findStaffReviews(userId),
        findStaffDocuments(userId),
    ]);

    return {
        staff: serializeStaff(staff),
        transactions: transactions.map(serializeStaffTransaction),
        reviews: reviews.map(serializeStaffReview),
        documents: documents.map(serializeStaffDocument),
    };
}

export async function updateStaffPersonalInformation(userIdInput, payload, file) {
    const userId = normalizeStaffIdOrThrow(userIdInput);
    const role = normalizeRole(payload.role);
    const accountType = ROLE_TO_ACCOUNT_TYPE[role];

    if (!accountType) {
        throw new AppError("Role must be one of admin or dispatcher.", 422, "INVALID_ROLE");
    }

    const email = normalizeEmail(payload.email);
    const phone = normalizeText(payload.phone);
    const routeId = normalizeOptionalInteger(payload.route_id) ?? null;
    const firstname = normalizeText(payload.firstname);
    const lastname = normalizeText(payload.lastname);
    const country = normalizeText(payload.country) || DEFAULT_COUNTRY;
    const countryCode = normalizeCountryCode(payload.country_code) || DEFAULT_COUNTRY_CODE;
    const countryDialCode =
        normalizeCountryDialCode(payload.country_dial_code) || DEFAULT_COUNTRY_DIAL_CODE;

    const [staffAccount, existingEmail, existingPhone, routeFound] = await Promise.all([
        findStaffAccountById(userId),
        findExistingAccountByEmail(email, userId),
        findExistingAccountByPhone(phone, userId),
        routeId ? routeExists(routeId) : Promise.resolve(true),
    ]);

    if (!staffAccount || Number(staffAccount.account_deleted) === 1) {
        throw new AppError("Staff not found.", 404, "STAFF_NOT_FOUND");
    }

    if (email && existingEmail) {
        throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_USED");
    }

    if (phone && existingPhone) {
        throw new AppError("Phone is already in use.", 409, "PHONE_ALREADY_USED");
    }

    if (!routeFound) {
        throw new AppError("Selected route does not exist.", 422, "ROUTE_NOT_FOUND");
    }

    const accountActive = normalizeBooleanFlag(payload.account_active, 1);
    const previousPhotoFile = staffAccount.photo_file;
    const uploadedPhotoFile = file ? await uploadStaffImage(file) : previousPhotoFile;

    try {
        await persistStaffPersonalInfo({
            userId,
            firstname,
            lastname,
            email,
            phone,
            address: normalizeText(payload.address),
            country,
            routeId,
            accountType,
            accountActive,
            photoFile: uploadedPhotoFile,
            countryCode,
            countryDialCode,
        });

        if (file && previousPhotoFile && previousPhotoFile !== uploadedPhotoFile) {
            try {
                await cleanupStaffImage(previousPhotoFile);
            } catch {
                // Ignore cleanup failure because update already succeeded.
            }
        }

        const updatedStaff = await findStaffById(userId);

        return {
            staff: serializeStaff(updatedStaff),
        };
    } catch (error) {
        if (file && uploadedPhotoFile && uploadedPhotoFile !== previousPhotoFile) {
            await cleanupStaffImage(uploadedPhotoFile);
        }

        throw error;
    }
}

export async function softDeleteStaffAccount(userIdInput, payload, auth) {
    const userId = normalizeStaffIdOrThrow(userIdInput);

    if (Number(auth?.userId) === userId) {
        throw new AppError("Admin cannot delete current logged-in account.", 409, "SELF_DELETE_FORBIDDEN");
    }

    const staff = await findStaffAccountById(userId);

    if (!staff) {
        throw new AppError("Staff not found.", 404, "STAFF_NOT_FOUND");
    }

    if (Number(staff.account_deleted) === 1) {
        throw new AppError("Staff account is already deleted.", 409, "STAFF_ALREADY_DELETED");
    }

    const adminAccount = await findAdminPasswordById(auth.userId);
    if (!adminAccount) {
        throw new AppError("Admin account could not be verified.", 401, "ADMIN_VERIFICATION_FAILED");
    }

    const passwordOk = await verifyPassword(payload.admin_password, adminAccount.password_hash);
    if (!passwordOk) {
        throw new AppError("Admin password is incorrect.", 401, "INVALID_ADMIN_PASSWORD");
    }

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();
        await persistStaffSoftDelete(userId, connection);
        await connection.commit();

        return {
            staff: {
                user_id: userId,
                account_deleted: 1,
            },
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function getCurrentStaffProfileDetail(auth) {
    assertStaffAuthOrThrow(auth);
    if (Number(auth.userType) !== 0) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return getStaffDetail(auth.userId);
}

export async function getStaffListByAdmin(query, auth) {
    assertAdminAuthOrThrow(auth);
    return getStaffList(query);
}

export async function getStaffSummaryByAdmin(query, auth) {
    assertAdminAuthOrThrow(auth);
    return getStaffSummary(query);
}

export async function getStaffDetailByAdmin(userIdInput, auth) {
    assertAdminAuthOrThrow(auth);
    return getStaffDetail(userIdInput);
}

export async function createStaffByAdmin(payload, file, auth) {
    assertAdminAuthOrThrow(auth);
    return createStaff(payload, file);
}

export async function updateStaffPersonalInformationByAdmin(userIdInput, payload, file, auth) {
    assertAdminAuthOrThrow(auth);
    return updateStaffPersonalInformation(userIdInput, payload, file);
}

export async function softDeleteStaffAccountByAdmin(userIdInput, payload, auth) {
    assertAdminAuthOrThrow(auth);
    return softDeleteStaffAccount(userIdInput, payload, auth);
}
