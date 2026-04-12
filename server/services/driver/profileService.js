import { deleteCloudinaryImage, uploadBufferToCloudinary } from "../../config/cloudinary.js";
import {
    createSubmission,
    findDocumentDefinitionById,
    findSubmissionByActorAndDocument,
    findSubmissionById,
    listDocumentDefinitions,
    listMySubmissions,
    updateSubmission,
} from "../../repositories/documentRepository.js";
import {
    findDriverOwnProfile,
    updateDriverOwnBankAccount,
    updateDriverOwnPhoto,
    updateDriverOwnProfile,
} from "../../repositories/driver/profileRepository.js";
import { routeExists } from "../../repositories/driverRepository.js";
import AppError from "../../utils/appError.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIVER_IMAGE_FOLDER = "thuexe/drivers";
const DOC_USER_DRIVER = 1;
const ALLOWED_CAR_COLOR_VALUES = new Set([
    "black", "brown", "red", "orange", "yellow", "green",
    "blue", "sky-blue", "pink", "purple", "grey", "white", "gold", "silver",
]);

// ─── Normalize helpers ────────────────────────────────────────────────────────

function normalizeText(value) {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s.length > 0 ? s : null;
}

function normalizeCapitalizedText(value) {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return normalized
        .toLocaleLowerCase("vi-VN")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toLocaleUpperCase("vi-VN") + w.slice(1))
        .join(" ");
}

function normalizeUppercaseText(value) {
    const normalized = normalizeText(value);
    return normalized ? normalized.toLocaleUpperCase("vi-VN") : null;
}

function normalizeNameForComparison(value) {
    const normalized = normalizeText(value);
    return normalized ? normalized.replace(/\s+/g, " ").toLocaleUpperCase("vi-VN") : null;
}

function normalizeBankName(payload) {
    const bankName = normalizeText(payload.bank_name);
    return bankName !== "other" ? bankName : normalizeText(payload.bank_name_custom);
}

// ─── Guard ────────────────────────────────────────────────────────────────────

function assertDriverActive(driver) {
    if (!driver) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }
    if (driver.account_deleted === 1) {
        throw new AppError("Account has been deleted.", 403, "ACCOUNT_DELETED");
    }
}

// ─── GET /me ──────────────────────────────────────────────────────────────────

export async function getMyProfile(auth) {
    const driverId = Number(auth.userId);
    const driver = await findDriverOwnProfile(driverId);
    assertDriverActive(driver);
    return { driver };
}

// ─── PATCH /me ────────────────────────────────────────────────────────────────

export async function patchMyProfile(auth, payload) {
    const driverId = Number(auth.userId);
    const driver = await findDriverOwnProfile(driverId);
    assertDriverActive(driver);

    const fields = {};

    // Personal information — read-only, drivers cannot change these fields
    if (payload.firstname !== undefined || payload.lastname !== undefined || payload.email !== undefined) {
        throw new AppError(
            "Personal information (name and email) cannot be changed. Please contact support for modifications.",
            403,
            "PERSONAL_INFO_IMMUTABLE"
        );
    }

    if (payload.drv_address !== undefined) {
        fields.drv_address = normalizeText(payload.drv_address);
    }
    if (payload.state !== undefined) {
        fields.state = normalizeText(payload.state);
    }
    if (payload.drv_country !== undefined) {
        fields.drv_country = normalizeText(payload.drv_country) || "Vietnam";
    }
    if (payload.country_code !== undefined) {
        const code = normalizeText(payload.country_code);
        fields.country_code = code ? code.toLowerCase() : driver.country_code;
    }
    if (payload.country_dial_code !== undefined) {
        const raw = normalizeText(payload.country_dial_code);
        if (raw) {
            const digits = raw.replace(/\D/g, "");
            fields.country_dial_code = digits ? `+${digits}` : driver.country_dial_code;
        }
    }
    if (payload.disp_lang !== undefined) {
        fields.disp_lang = normalizeText(payload.disp_lang);
    }

    // Vehicle fields — require allow_vehicle_edit = 1
    const vehicleKeys = ["car_model", "car_plate_num", "car_reg_num", "car_color", "car_year"];
    const hasVehicleUpdate = vehicleKeys.some((k) => payload[k] !== undefined);
    if (hasVehicleUpdate) {
        if (driver.allow_vehicle_edit !== 1) {
            throw new AppError(
                "Vehicle information editing is not currently allowed.",
                403,
                "VEHICLE_EDIT_NOT_ALLOWED"
            );
        }
        if (payload.car_model !== undefined) fields.car_model = normalizeText(payload.car_model);
        if (payload.car_plate_num !== undefined) fields.car_plate_num = normalizeText(payload.car_plate_num);
        if (payload.car_reg_num !== undefined) fields.car_reg_num = normalizeText(payload.car_reg_num);
        if (payload.car_color !== undefined) {
            const color = normalizeText(payload.car_color);
            if (color && !ALLOWED_CAR_COLOR_VALUES.has(color)) {
                throw new AppError("car_color is not supported.", 422, "INVALID_CAR_COLOR");
            }
            fields.car_color = color;
        }
        if (payload.car_year !== undefined) {
            fields.car_year = String(Number(payload.car_year));
        }
    }

    // Route field — require allow_city_edit = 1
    if (payload.reg_route_id !== undefined) {
        if (driver.allow_city_edit !== 1) {
            throw new AppError(
                "City/route editing is not currently allowed.",
                403,
                "CITY_EDIT_NOT_ALLOWED"
            );
        }
        const routeId = Number(payload.reg_route_id);
        const found = await routeExists(routeId);
        if (!found) {
            throw new AppError("Selected route does not exist.", 422, "ROUTE_NOT_FOUND");
        }
        // Mirror admin behaviour: route_id tracks the same value as reg_route_id
        fields.reg_route_id = routeId;
        fields.route_id = routeId;
    }

    if (Object.keys(fields).length === 0) {
        return { driver, updated: false };
    }

    await updateDriverOwnProfile(driverId, fields);
    const updated = await findDriverOwnProfile(driverId);
    return { driver: updated, updated: true };
}

// ─── GET /me/account-status ───────────────────────────────────────────────────

export async function getMyAccountStatus(auth) {
    const driverId = Number(auth.userId);
    const driver = await findDriverOwnProfile(driverId);
    assertDriverActive(driver);

    return {
        account_status: {
            is_activated: driver.is_activated,
            account_active: driver.account_active,
            account_deleted: driver.account_deleted,
            available: driver.available,
            available_for_rental: driver.available_for_rental,
            operation_status: driver.operation_status,
        },
        flags: {
            can_take_rides:
                driver.is_activated === 1 &&
                driver.account_active === 1 &&
                driver.available === 1,
            can_take_rentals:
                driver.is_activated === 1 &&
                driver.account_active === 1 &&
                driver.available_for_rental === 1,
            allow_photo_edit: driver.allow_photo_edit === 1,
            allow_vehicle_edit: driver.allow_vehicle_edit === 1,
            allow_city_edit: driver.allow_city_edit === 1,
        },
    };
}

// ─── PATCH /me/bank-account ───────────────────────────────────────────────────

export async function patchMyBankAccount(auth, payload) {
    const driverId = Number(auth.userId);
    const driver = await findDriverOwnProfile(driverId);
    assertDriverActive(driver);

    // Bank account information is read-only and cannot be changed by drivers
    // Drivers must contact support to modify bank account details
    throw new AppError(
        "Bank account information cannot be changed. Please contact support for modifications.",
        403,
        "BANK_ACCOUNT_IMMUTABLE"
    );
}

// ─── GET /me/documents-required ───────────────────────────────────────────────

export async function getRequiredDocuments(auth) {
    const driverId = Number(auth.userId);
    const driver = await findDriverOwnProfile(driverId);
    assertDriverActive(driver);

    // Fetch active driver docs (doc_user=1). If driver has a route, also return
    // city-specific docs for that route (listDocumentDefinitions uses OR NULL logic).
    const items = await listDocumentDefinitions({
        docUser: DOC_USER_DRIVER,
        status: 1,
        docCity: driver.reg_route_id ?? undefined,
    });

    return { items };
}

// ─── GET /me/documents ────────────────────────────────────────────────────────

export async function getMyDocuments(auth) {
    const items = await listMySubmissions({
        actorType: "driver",
        actorId: Number(auth.userId),
    });
    return { items };
}

// ─── POST /me/documents ───────────────────────────────────────────────────────

export async function submitMyDriverDocument(auth, payload) {
    const actorId = Number(auth.userId);
    const documentId = Number(payload.document_id);

    const definition = await findDocumentDefinitionById(documentId);
    if (!definition || definition.status !== 1) {
        throw new AppError(
            "Document definition not found or inactive.",
            404,
            "DOCUMENT_NOT_FOUND"
        );
    }
    if (definition.doc_user !== DOC_USER_DRIVER) {
        throw new AppError(
            "This document is not applicable for drivers.",
            422,
            "DOCUMENT_NOT_FOR_DRIVER"
        );
    }

    const docNumber = payload.doc_number
        ? String(payload.doc_number).trim() || null
        : null;
    const docExpiryDate = payload.doc_expiry_date || null;

    if (definition.doc_id_num === 1 && !docNumber) {
        throw new AppError(
            "doc_number is required for this document.",
            422,
            "DOC_NUMBER_REQUIRED"
        );
    }
    if (definition.doc_expiry === 1 && !docExpiryDate) {
        throw new AppError(
            "doc_expiry_date is required for this document.",
            422,
            "DOC_EXPIRY_REQUIRED"
        );
    }

    const existing = await findSubmissionByActorAndDocument({
        actorType: "driver",
        actorId,
        documentId,
    });

    if (existing) {
        await updateSubmission({
            actorType: "driver",
            submissionId: existing.id,
            docNumber,
            expiryDate: docExpiryDate,
        });
        return {
            submission: await findSubmissionById({ actorType: "driver", submissionId: existing.id }),
            action: "updated",
        };
    }

    const submissionId = await createSubmission({
        actorType: "driver",
        actorId,
        documentId,
        docNumber,
        expiryDate: docExpiryDate,
    });
    return {
        submission: await findSubmissionById({ actorType: "driver", submissionId }),
        action: "created",
    };
}

// ─── PATCH /me/photo ──────────────────────────────────────────────────────────

export async function patchMyPhoto(auth, file) {
    const driverId = Number(auth.userId);
    const driver = await findDriverOwnProfile(driverId);
    assertDriverActive(driver);

    if (driver.allow_photo_edit !== 1) {
        throw new AppError(
            "Photo editing is not currently allowed.",
            403,
            "PHOTO_EDIT_NOT_ALLOWED"
        );
    }
    if (!file?.buffer) {
        throw new AppError("Photo file is required.", 422, "PHOTO_REQUIRED");
    }

    let uploadedUrl;
    try {
        const result = await uploadBufferToCloudinary(file.buffer, {
            folder: DRIVER_IMAGE_FOLDER,
            resource_type: "image",
        });
        uploadedUrl = result.secure_url;
    } catch {
        throw new AppError("Failed to upload photo.", 502, "PHOTO_UPLOAD_FAILED");
    }

    try {
        await updateDriverOwnPhoto(driverId, uploadedUrl);
    } catch (error) {
        // Rollback: delete freshly uploaded image so storage stays clean
        try { await deleteCloudinaryImage(uploadedUrl); } catch { }
        throw error;
    }

    // Non-fatal: clean up the old photo after a successful DB update
    const previousPhoto = driver.photo_file;
    if (previousPhoto && previousPhoto !== uploadedUrl) {
        try { await deleteCloudinaryImage(previousPhoto); } catch { }
    }

    const updated = await findDriverOwnProfile(driverId);
    return { driver: updated };
}
