import sqldb from "../config/sqldatabase.js";
import {
    countVehicleOwners,
    findExistingOwnerByEmail,
    findExistingOwnerByPhone,
    findVehicleOwnerById,
    findVehicleOwnerDocuments,
    findVehicleOwnerRentals,
    findVehicleOwners,
    findVehicleOwnerStats,
    findVehicleOwnerVehicles,
    findVehicleOwnerWalletLedger,
    findVehicleOwnerWithdrawals,
    insertVehicleOwner,
    softDeleteVehicleOwnerAccount as persistVehicleOwnerSoftDelete,
    summarizeVehicleOwners,
    updateVehicleOwnerAccountStatus as persistVehicleOwnerAccountStatus,
    updateVehicleOwnerPersonalInfo as persistVehicleOwnerPersonalInfo,
} from "../repositories/vehicleOwnerAdminRepository.js";
import AppError from "../utils/appError.js";
import { hashPassword } from "../utils/password.js";

const ALLOWED_VERIFICATION_STATUS = new Set(["not_submitted", "pending_review", "verified", "rejected"]);
const SORT_BY_WHITELIST = new Set(["owner_id", "fullname", "date_created", "commission_rate"]);

function normalizeText(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function normalizeEmail(email) {
    const normalized = normalizeText(email);
    return normalized ? normalized.toLowerCase() : null;
}

function normalizeBooleanFlag(value, defaultValue = 0) {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value ? 1 : 0;
    const normalized = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return 1;
    if (["0", "false", "no", "off"].includes(normalized)) return 0;
    return defaultValue;
}

function normalizeStrictBooleanFlag(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    const normalized = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return 1;
    if (["0", "false", "no", "off"].includes(normalized)) return 0;
    return null;
}

function normalizeOptionalInteger(value) {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
}

function normalizeQueryInteger(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    return Number(value);
}

function normalizeOwnerIdOrThrow(value) {
    const ownerId = normalizeOptionalInteger(value);
    if (!Number.isInteger(ownerId) || ownerId < 1) {
        throw new AppError("Invalid owner id.", 422, "INVALID_OWNER_ID");
    }
    return ownerId;
}

function serializeOwner(owner) {
    return {
        owner_id: owner.owner_id,
        user_id: owner.user_id,
        fullname: owner.fullname,
        phone: owner.phone,
        email: owner.email,
        address: owner.address,
        bank_name: owner.bank_name,
        bank_account: owner.bank_account,
        bank_code: owner.bank_code,
        swift_code: owner.swift_code,
        is_activated: owner.is_activated,
        account_active: owner.account_active,
        account_deleted: owner.account_deleted,
        verification_status: owner.verification_status,
        verification_submitted_at: owner.verification_submitted_at,
        verification_reviewed_at: owner.verification_reviewed_at,
        verification_admin_note: owner.verification_admin_note,
        commission_rate: owner.commission_rate,
        status: owner.status,
        wallet_balance: owner.wallet_balance,
        date_created: owner.date_created,
    };
}

function serializeOwnerListItem(owner) {
    return {
        owner_id: owner.owner_id,
        fullname: owner.fullname,
        phone: owner.phone,
        email: owner.email,
        verification_status: owner.verification_status,
        is_activated: owner.is_activated,
        account_active: owner.account_active,
        account_deleted: owner.account_deleted,
        commission_rate: owner.commission_rate,
        wallet_balance: owner.wallet_balance,
        date_created: owner.date_created,
    };
}

function normalizeOwnerFilters(query = {}) {
    const page = Math.max(normalizeQueryInteger(query.page, 1), 1);
    const limit = Math.min(Math.max(normalizeQueryInteger(query.limit, 10), 1), 100);
    const sortBy = SORT_BY_WHITELIST.has(query.sort_by) ? query.sort_by : "date_created";
    const sortOrder = String(query.sort_order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    return {
        page,
        limit,
        account_active: query.account_active === undefined ? undefined : normalizeBooleanFlag(query.account_active, 0),
        is_activated: query.is_activated === undefined ? undefined : normalizeBooleanFlag(query.is_activated, 0),
        account_deleted: query.account_deleted === undefined ? undefined : normalizeBooleanFlag(query.account_deleted, 0),
        status: query.status === undefined ? undefined : normalizeBooleanFlag(query.status, 0),
        verification_status:
            ALLOWED_VERIFICATION_STATUS.has(query.verification_status) ? query.verification_status : undefined,
        date_from: normalizeText(query.date_from),
        date_to: normalizeText(query.date_to),
        search: normalizeText(query.search),
        sort_by: sortBy,
        sort_order: sortOrder,
    };
}

function buildOwnerWritePayload(payload, options = {}) {
    const ownerAccount = options.ownerAccount || null;
    const accountActive =
        payload.account_active === undefined
            ? ownerAccount?.account_active ?? 1
            : normalizeBooleanFlag(payload.account_active, ownerAccount?.account_active ?? 1);
    const isActivated =
        payload.is_activated === undefined
            ? ownerAccount?.is_activated ?? 1
            : normalizeBooleanFlag(payload.is_activated, ownerAccount?.is_activated ?? 1);
    const accountDeleted =
        payload.account_deleted === undefined
            ? ownerAccount?.account_deleted ?? 0
            : normalizeBooleanFlag(payload.account_deleted, ownerAccount?.account_deleted ?? 0);
    const status =
        payload.status === undefined
            ? ownerAccount?.status ?? accountActive
            : normalizeBooleanFlag(payload.status, ownerAccount?.status ?? accountActive);
    const verificationStatus =
        payload.verification_status && ALLOWED_VERIFICATION_STATUS.has(payload.verification_status)
            ? payload.verification_status
            : ownerAccount?.verification_status || "not_submitted";
    const commissionRate =
        payload.commission_rate === undefined || payload.commission_rate === null || payload.commission_rate === ""
            ? Number(ownerAccount?.commission_rate ?? 0)
            : Number(payload.commission_rate);

    return {
        fullname: normalizeText(payload.fullname),
        phone: normalizeText(payload.phone),
        email: normalizeEmail(payload.email),
        address: normalizeText(payload.address),
        bankName: normalizeText(payload.bank_name),
        bankAccount: normalizeText(payload.bank_account),
        bankCode: normalizeText(payload.bank_code),
        swiftCode: normalizeText(payload.swift_code),
        isActivated,
        accountActive,
        accountDeleted,
        verificationStatus,
        commissionRate,
        status,
    };
}

function serializeVehicle(vehicle) {
    return {
        vehicle_id: vehicle.vehicle_id,
        type_id: vehicle.type_id,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        license_plate: vehicle.license_plate,
        status: vehicle.status,
        is_verified: vehicle.is_verified,
        verification_status: vehicle.verification_status,
        date_added: vehicle.date_added,
    };
}

function serializeRental(rental) {
    return {
        rental_id: rental.rental_id,
        rental_code: rental.rental_code,
        vehicle_id: rental.vehicle_id,
        driver_id: rental.driver_id,
        user_id: rental.user_id,
        customer_name: rental.customer_name,
        service_type: rental.service_type,
        start_datetime: rental.start_datetime,
        end_datetime: rental.end_datetime,
        total_price: rental.total_price,
        payment_status: rental.payment_status,
        status: rental.status,
        created_at: rental.created_at,
    };
}

function serializeWithdrawal(withdrawal) {
    return {
        withdrawal_id: withdrawal.withdrawal_id,
        wallet_id: withdrawal.wallet_id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        note: withdrawal.note,
        requested_at: withdrawal.requested_at,
        processed_at: withdrawal.processed_at,
    };
}

function serializeWalletLedger(ledger) {
    return {
        ledger_id: ledger.ledger_id,
        wallet_id: ledger.wallet_id,
        payment_id: ledger.payment_id,
        payment_code: ledger.payment_code,
        rental_id: ledger.rental_id,
        booking_id: ledger.booking_id,
        payment_status: ledger.payment_status,
        amount: ledger.amount,
        balance_after: ledger.balance_after,
        direction: ledger.direction,
        entry_type: ledger.entry_type,
        source_type: ledger.source_type,
        source_id: ledger.source_id,
        description: ledger.description,
        created_at: ledger.created_at,
    };
}

function serializeDocument(document) {
    return {
        id: document.id,
        owner_id: document.owner_id,
        document_id: document.document_id,
        document_title: document.document_title,
        doc_number: document.doc_number,
        doc_expiry_date: document.doc_expiry_date,
        file_url: document.file_url,
        mime_type: document.mime_type,
        file_size: document.file_size,
        verified: document.verified,
        status: document.status,
        review_note: document.review_note,
        date_submitted: document.date_submitted,
        updated_at: document.updated_at,
    };
}

export async function getVehicleOwnerMeta() {
    return {
        verificationStatuses: ["not_submitted", "pending_review", "verified", "rejected"],
        accountStatusOptions: [
            { label: "Active", value: 1 },
            { label: "Locked", value: 0 },
        ],
        sortableFields: Array.from(SORT_BY_WHITELIST),
    };
}

export async function getVehicleOwnerList(query) {
    const filters = normalizeOwnerFilters(query);
    const [items, totalItems] = await Promise.all([findVehicleOwners(filters), countVehicleOwners(filters)]);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.limit);

    return {
        items: items.map(serializeOwnerListItem),
        pagination: {
            page: filters.page,
            limit: filters.limit,
            totalPages,
            hasNextPage: totalPages > 0 && filters.page < totalPages,
            hasPrevPage: filters.page > 1,
        },
        totalItems,
    };
}

export async function getVehicleOwnerSummary(query) {
    const filters = normalizeOwnerFilters(query);
    return summarizeVehicleOwners(filters);
}

export async function getVehicleOwnerDetail(ownerIdInput) {
    const ownerId = normalizeOwnerIdOrThrow(ownerIdInput);
    const owner = await findVehicleOwnerById(ownerId);

    if (!owner) {
        throw new AppError("Vehicle owner not found.", 404, "OWNER_NOT_FOUND");
    }

    const [stats, vehicles, rentals, withdrawals, walletLedger, documents] = await Promise.all([
        findVehicleOwnerStats(ownerId),
        findVehicleOwnerVehicles(ownerId),
        findVehicleOwnerRentals(ownerId),
        findVehicleOwnerWithdrawals(ownerId),
        findVehicleOwnerWalletLedger(ownerId),
        findVehicleOwnerDocuments(ownerId),
    ]);

    return {
        owner: serializeOwner(owner),
        stats,
        vehicles: vehicles.map(serializeVehicle),
        rentals: rentals.map(serializeRental),
        withdrawals: withdrawals.map(serializeWithdrawal),
        walletLedger: walletLedger.map(serializeWalletLedger),
        documents: documents.map(serializeDocument),
    };
}

export async function createVehicleOwner(payload) {
    const ownerPayload = buildOwnerWritePayload(payload);
    const [existingEmail, existingPhone, passwordHash] = await Promise.all([
        findExistingOwnerByEmail(ownerPayload.email),
        findExistingOwnerByPhone(ownerPayload.phone),
        payload.password ? hashPassword(payload.password) : Promise.resolve(null),
    ]);

    if (existingEmail) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_USED");
    if (existingPhone) throw new AppError("Phone is already in use.", 409, "PHONE_ALREADY_USED");

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        const ownerId = await insertVehicleOwner(
            {
                ...ownerPayload,
                passwordHash,
            },
            connection
        );

        await connection.commit();
        const owner = await findVehicleOwnerById(ownerId);
        if (!owner) {
            throw new AppError("Vehicle owner created but could not be loaded.", 500, "OWNER_READ_FAILED");
        }
        return { owner: serializeOwner(owner) };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function updateVehicleOwnerPersonalInformation(ownerIdInput, payload) {
    const ownerId = normalizeOwnerIdOrThrow(ownerIdInput);
    const ownerAccount = await findVehicleOwnerById(ownerId);

    if (!ownerAccount) {
        throw new AppError("Vehicle owner not found.", 404, "OWNER_NOT_FOUND");
    }
    if (ownerAccount.account_deleted === 1) {
        throw new AppError("Deleted vehicle owner account cannot be updated.", 409, "OWNER_ACCOUNT_DELETED");
    }

    const ownerPayload = buildOwnerWritePayload(payload, { ownerAccount });
    const [existingEmail, existingPhone] = await Promise.all([
        findExistingOwnerByEmail(ownerPayload.email, ownerId),
        findExistingOwnerByPhone(ownerPayload.phone, ownerId),
    ]);

    if (existingEmail) throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_USED");
    if (existingPhone) throw new AppError("Phone is already in use.", 409, "PHONE_ALREADY_USED");

    await persistVehicleOwnerPersonalInfo({
        ownerId,
        ...ownerPayload,
    });

    const updatedOwner = await findVehicleOwnerById(ownerId);
    return { owner: serializeOwner(updatedOwner) };
}

export async function updateVehicleOwnerAccountState(ownerIdInput, payload) {
    const ownerId = normalizeOwnerIdOrThrow(ownerIdInput);
    const payloadOwnerId =
        payload.owner_id === undefined || payload.owner_id === null || payload.owner_id === ""
            ? null
            : normalizeOwnerIdOrThrow(payload.owner_id);
    const accountActive = normalizeStrictBooleanFlag(payload.account_active);
    const status = payload.status === undefined ? accountActive : normalizeStrictBooleanFlag(payload.status);

    if (payloadOwnerId !== null && payloadOwnerId !== ownerId) {
        throw new AppError("owner_id does not match the requested owner.", 422, "OWNER_ID_MISMATCH");
    }
    if (![0, 1].includes(accountActive)) {
        throw new AppError("account_active must be 0 or 1.", 422, "INVALID_ACCOUNT_STATUS");
    }
    if (![0, 1].includes(status)) {
        throw new AppError("status must be 0 or 1.", 422, "INVALID_STATUS");
    }

    const ownerAccount = await findVehicleOwnerById(ownerId);
    if (!ownerAccount) {
        throw new AppError("Vehicle owner not found.", 404, "OWNER_NOT_FOUND");
    }
    if (ownerAccount.account_active === accountActive && ownerAccount.status === status) {
        throw new AppError("Vehicle owner account status is unchanged.", 409, "INVALID_ACCOUNT_STATE_CHANGE");
    }

    await persistVehicleOwnerAccountStatus({ ownerId, accountActive, status });
    const updatedOwner = await findVehicleOwnerById(ownerId);

    return {
        owner: serializeOwner(updatedOwner),
        action: accountActive === 1 ? "unlocked" : "locked",
    };
}

export async function softDeleteVehicleOwner(ownerIdInput, payload = {}) {
    const ownerId = normalizeOwnerIdOrThrow(ownerIdInput);
    const payloadOwnerId =
        payload.owner_id === undefined || payload.owner_id === null || payload.owner_id === ""
            ? null
            : normalizeOwnerIdOrThrow(payload.owner_id);

    if (payloadOwnerId !== null && payloadOwnerId !== ownerId) {
        throw new AppError("owner_id does not match the requested owner.", 422, "OWNER_ID_MISMATCH");
    }

    const owner = await findVehicleOwnerById(ownerId);
    if (!owner) {
        throw new AppError("Vehicle owner not found.", 404, "OWNER_NOT_FOUND");
    }

    if (owner.account_deleted === 1) {
        return {
            owner: serializeOwner(owner),
            action: "already_deleted",
        };
    }

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();
        await persistVehicleOwnerSoftDelete(ownerId, connection);
        await connection.commit();

        const updatedOwner = await findVehicleOwnerById(ownerId);
        return {
            owner: updatedOwner ? serializeOwner(updatedOwner) : { owner_id: ownerId, account_deleted: 1 },
            action: "deleted",
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export const __vehicleOwnerAdminTestUtils = {
    normalizeOwnerIdOrThrow,
};


