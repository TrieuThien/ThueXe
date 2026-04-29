import AppError from "../utils/appError.js";
import {
    createDocumentDefinition,
    createSubmission,
    deleteDocumentDefinition,
    findDocumentDefinitionById,
    findOwnerSubmissionById,
    findVehicleSubmissionById,
    findSubmissionByActorAndDocument,
    findSubmissionById,
    listAllSubmissions,
    listDocumentDefinitions,
    listMySubmissions,
    listVehicleSubmissions,
    setOwnerSubmissionVerification,
    setSubmissionVerification,
    updateVehicleSubmissionReview,
    updateDocumentDefinition,
    updateSubmission,
} from "../repositories/documentRepository.js";
import {
    listVehicleDocuments,
    listOwnerDocuments,
    listOwnerRequiredDocuments,
    updateOwnerVerificationState,
    updateVehicleVerificationStatus,
} from "../repositories/ownerRepository.js";

function getMyActorType(auth) {
    return auth.role === "driver" ? "driver" : "user";
}

function resolveVehicleStatusAfterReview(docs) {
    if (docs.length === 0) return "missing_documents";
    if (docs.some((d) => !d.file_url)) return "missing_documents";
    if (docs.some((d) => d.status === "rejected")) return "rejected";
    if (docs.some((d) => d.status !== "verified")) return "pending_review";
    return "verified";
}

function normalizeDefinitionPayload(payload, existing = null) {
    return {
        title: String(payload.title ?? existing?.title ?? "").trim(),
        doc_desc: String(payload.doc_desc ?? existing?.doc_desc ?? "").trim(),
        doc_city:
            payload.doc_city === undefined || payload.doc_city === null || payload.doc_city === ""
                ? existing?.doc_city ?? null
                : Number(payload.doc_city),
        doc_type: payload.doc_type === undefined ? existing?.doc_type ?? 0 : Number(payload.doc_type),
        doc_user: payload.doc_user === undefined ? existing?.doc_user ?? 1 : Number(payload.doc_user),
        doc_expiry: payload.doc_expiry === undefined ? existing?.doc_expiry ?? 0 : Number(payload.doc_expiry),
        doc_id_num: payload.doc_id_num === undefined ? existing?.doc_id_num ?? 0 : Number(payload.doc_id_num),
        doc_id_num_title: String(payload.doc_id_num_title ?? existing?.doc_id_num_title ?? "").trim(),
        doc_id_num_desc: String(payload.doc_id_num_desc ?? existing?.doc_id_num_desc ?? "").trim(),
        doc_two_sides: payload.doc_two_sides === undefined ? existing?.doc_two_sides ?? 0 : Number(payload.doc_two_sides),
        status: payload.status === undefined ? existing?.status ?? 1 : Number(payload.status),
    };
}

function normalizeSubmissionPayload(payload) {
    return {
        document_id: Number(payload.document_id),
        doc_number:
            payload.doc_number === undefined || payload.doc_number === null
                ? null
                : String(payload.doc_number).trim() || null,
        doc_expiry_date:
            payload.doc_expiry_date === undefined || payload.doc_expiry_date === null || payload.doc_expiry_date === ""
                ? null
                : String(payload.doc_expiry_date),
    };
}

function validateSubmissionByDefinition(definition, data) {
    if (!definition || definition.status !== 1) {
        throw new AppError("Document definition not found or inactive.", 404, "DOCUMENT_NOT_FOUND");
    }
    if (definition.doc_id_num === 1 && !data.doc_number) {
        throw new AppError("doc_number is required for this document.", 422, "DOC_NUMBER_REQUIRED");
    }
    if (definition.doc_expiry === 1 && !data.doc_expiry_date) {
        throw new AppError("doc_expiry_date is required for this document.", 422, "DOC_EXPIRY_REQUIRED");
    }
}

function parsePositiveIntQuery(value, { fieldName, errorCode }) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 1) {
        throw new AppError(`${fieldName} must be a positive integer.`, 422, errorCode);
    }
    return numeric;
}

export async function getDocumentDefinitions({ query }) {
    const id = parsePositiveIntQuery(query.id, { fieldName: "id", errorCode: "INVALID_DOCUMENT_ID_QUERY" });
    const aliasDocumentId = parsePositiveIntQuery(query.document_id, {
        fieldName: "document_id",
        errorCode: "INVALID_DOCUMENT_ID_QUERY",
    });
    const status = query.status === undefined || query.status === "" ? undefined : Number(query.status);
    const docUser = query.doc_user === undefined || query.doc_user === "" ? undefined : Number(query.doc_user);
    const docType = query.doc_type === undefined || query.doc_type === "" ? undefined : Number(query.doc_type);
    const docCity = query.doc_city === undefined || query.doc_city === "" ? undefined : Number(query.doc_city);
    // Backward compatibility: id and document_id are aliases for the same document key, so combine with OR.
    const documentIds = Array.from(new Set([id, aliasDocumentId].filter((item) => item !== undefined)));
    return {
        items: await listDocumentDefinitions({ status, docUser, docType, docCity, documentIds }),
    };
}

export async function createDocumentDefinitionService({ payload }) {
    const data = normalizeDefinitionPayload(payload);
    const documentId = await createDocumentDefinition(data);
    return {
        document: await findDocumentDefinitionById(documentId),
    };
}

export async function updateDocumentDefinitionService({ documentId, payload }) {
    const numericDocumentId = Number(documentId);
    if (!Number.isInteger(numericDocumentId) || numericDocumentId < 1) {
        throw new AppError("Invalid document id.", 422, "INVALID_DOCUMENT_ID");
    }
    const existing = await findDocumentDefinitionById(numericDocumentId);
    if (!existing) {
        throw new AppError("Document definition not found.", 404, "DOCUMENT_NOT_FOUND");
    }
    const data = normalizeDefinitionPayload(payload, existing);
    await updateDocumentDefinition(numericDocumentId, data);
    return {
        document: await findDocumentDefinitionById(numericDocumentId),
    };
}

export async function deleteDocumentDefinitionService({ documentId }) {
    const numericDocumentId = Number(documentId);
    if (!Number.isInteger(numericDocumentId) || numericDocumentId < 1) {
        throw new AppError("Invalid document id.", 422, "INVALID_DOCUMENT_ID");
    }
    const existing = await findDocumentDefinitionById(numericDocumentId);
    if (!existing) {
        throw new AppError("Document definition not found.", 404, "DOCUMENT_NOT_FOUND");
    }
    await deleteDocumentDefinition(numericDocumentId);
    return { deleted: true, document_id: numericDocumentId };
}

export async function listMyDocumentSubmissions({ auth }) {
    const actorType = getMyActorType(auth);
    return {
        items: await listMySubmissions({ actorType, actorId: Number(auth.userId) }),
    };
}

export async function submitMyDocument({ auth, payload }) {
    const actorType = getMyActorType(auth);
    const actorId = Number(auth.userId);
    const data = normalizeSubmissionPayload(payload);
    const definition = await findDocumentDefinitionById(data.document_id);
    validateSubmissionByDefinition(definition, data);

    const existing = await findSubmissionByActorAndDocument({
        actorType,
        actorId,
        documentId: data.document_id,
    });
    if (existing) {
        await updateSubmission({
            actorType,
            submissionId: existing.id,
            docNumber: data.doc_number,
            expiryDate: data.doc_expiry_date,
        });
        return {
            submission: await findSubmissionById({ actorType, submissionId: existing.id }),
            action: "updated",
        };
    }

    const submissionId = await createSubmission({
        actorType,
        actorId,
        documentId: data.document_id,
        docNumber: data.doc_number,
        expiryDate: data.doc_expiry_date,
    });
    return {
        submission: await findSubmissionById({ actorType, submissionId }),
        action: "created",
    };
}

export async function updateMySubmission({ auth, submissionId, payload }) {
    const actorType = getMyActorType(auth);
    const actorId = Number(auth.userId);
    const numericSubmissionId = Number(submissionId);
    if (!Number.isInteger(numericSubmissionId) || numericSubmissionId < 1) {
        throw new AppError("Invalid submission id.", 422, "INVALID_SUBMISSION_ID");
    }
    const existing = await findSubmissionById({ actorType, submissionId: numericSubmissionId });
    if (!existing) {
        throw new AppError("Submission not found.", 404, "SUBMISSION_NOT_FOUND");
    }
    if (existing.actor_id !== actorId) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const definition = await findDocumentDefinitionById(existing.document_id);
    const merged = {
        document_id: existing.document_id,
        doc_number: payload.doc_number !== undefined ? String(payload.doc_number).trim() : existing.doc_number,
        doc_expiry_date: payload.doc_expiry_date !== undefined ? payload.doc_expiry_date : existing.doc_expiry_date,
    };
    validateSubmissionByDefinition(definition, merged);

    await updateSubmission({
        actorType,
        submissionId: numericSubmissionId,
        docNumber: merged.doc_number,
        expiryDate: merged.doc_expiry_date,
    });
    return {
        submission: await findSubmissionById({ actorType, submissionId: numericSubmissionId }),
    };
}

export async function listAllDocumentSubmissionsService({ query }) {
    const actorType = query.actor_type ? String(query.actor_type).trim() : undefined;
    const verified = query.verified === undefined || query.verified === "" ? undefined : Number(query.verified);
    const submissionId = parsePositiveIntQuery(query.id, {
        fieldName: "id",
        errorCode: "INVALID_SUBMISSION_ID_QUERY",
    });
    const documentId = parsePositiveIntQuery(query.document_id, {
        fieldName: "document_id",
        errorCode: "INVALID_DOCUMENT_ID_QUERY",
    });
    if (actorType && !["user", "driver", "owner"].includes(actorType)) {
        throw new AppError("actor_type must be user, driver, or owner.", 422, "INVALID_ACTOR_TYPE");
    }
    return {
        items: await listAllSubmissions({ actorType, verified, submissionId, documentId }),
    };
}

export async function reviewDocumentSubmission({ actorType, submissionId, payload }) {
    const normalizedActorType = String(actorType || "").trim();
    if (!["user", "driver", "owner"].includes(normalizedActorType)) {
        throw new AppError("actorType must be user, driver, or owner.", 422, "INVALID_ACTOR_TYPE");
    }
    const numericSubmissionId = Number(submissionId);
    if (!Number.isInteger(numericSubmissionId) || numericSubmissionId < 1) {
        throw new AppError("Invalid submission id.", 422, "INVALID_SUBMISSION_ID");
    }

    const status = String(payload.status || "").trim().toLowerCase();
    if (!["approved", "rejected", "expired"].includes(status)) {
        throw new AppError("status must be approved/rejected/expired.", 422, "INVALID_REVIEW_STATUS");
    }

    let verified = 0;
    if (status === "approved") verified = 1;

    if (normalizedActorType === "owner") {
        const existing = await findOwnerSubmissionById(numericSubmissionId);
        if (!existing) {
            throw new AppError("Submission not found.", 404, "SUBMISSION_NOT_FOUND");
        }
        const reviewNote = String(payload.review_note || "").trim() || null;
        const docStatus = status === "approved" ? "verified" : status;
        await setOwnerSubmissionVerification({ submissionId: numericSubmissionId, verified, docStatus, reviewNote });

        const ownerId = existing.actor_id;
        if (status === "rejected" || status === "expired") {
            await updateOwnerVerificationState(ownerId, {
                verification_status: "rejected",
                verification_submitted_at: null,
                verification_admin_note: reviewNote,
            });
        } else if (status === "approved") {
            const [requiredDocs, submittedDocs] = await Promise.all([
                listOwnerRequiredDocuments(),
                listOwnerDocuments(ownerId),
            ]);
            const submittedMap = new Map(submittedDocs.map((d) => [Number(d.document_id), d]));
            const allVerified =
                requiredDocs.length > 0 &&
                requiredDocs.every((req) => {
                    const submitted = submittedMap.get(Number(req.id));
                    return submitted && submitted.status === "verified";
                });
            if (allVerified) {
                await updateOwnerVerificationState(ownerId, {
                    verification_status: "verified",
                    verification_submitted_at: null,
                    verification_admin_note: null,
                });
            }
        }

        return {
            submission: await findOwnerSubmissionById(numericSubmissionId),
            review_status: status,
        };
    }

    const existing = await findSubmissionById({
        actorType: normalizedActorType,
        submissionId: numericSubmissionId,
    });
    if (!existing) {
        throw new AppError("Submission not found.", 404, "SUBMISSION_NOT_FOUND");
    }
    await setSubmissionVerification({
        actorType: normalizedActorType,
        submissionId: numericSubmissionId,
        verified,
    });
    return {
        submission: await findSubmissionById({
            actorType: normalizedActorType,
            submissionId: numericSubmissionId,
        }),
        review_status: status,
    };
}

export async function listVehicleDocumentSubmissionsService({ query }) {
    const submissionId = parsePositiveIntQuery(query.id, {
        fieldName: "id",
        errorCode: "INVALID_VEHICLE_SUBMISSION_ID_QUERY",
    });
    const documentId = parsePositiveIntQuery(query.document_id, {
        fieldName: "document_id",
        errorCode: "INVALID_DOCUMENT_ID_QUERY",
    });
    const vehicleId = parsePositiveIntQuery(query.vehicle_id, {
        fieldName: "vehicle_id",
        errorCode: "INVALID_VEHICLE_ID_QUERY",
    });
    const ownerId = parsePositiveIntQuery(query.owner_id, {
        fieldName: "owner_id",
        errorCode: "INVALID_OWNER_ID_QUERY",
    });
    const verified = query.verified === undefined || query.verified === "" ? undefined : Number(query.verified);
    const status = query.status === undefined || query.status === "" ? undefined : String(query.status).trim().toLowerCase();
    const docCity = parsePositiveIntQuery(query.doc_city, {
        fieldName: "doc_city",
        errorCode: "INVALID_DOC_CITY_QUERY",
    });

    if (verified !== undefined && ![0, 1].includes(verified)) {
        throw new AppError("verified must be 0 or 1.", 422, "INVALID_VERIFIED_QUERY");
    }

    const allowedStatuses = ["missing", "pending", "verified", "rejected", "expired"];
    if (status !== undefined && !allowedStatuses.includes(status)) {
        throw new AppError(
            `status must be one of ${allowedStatuses.join("|")}.`,
            422,
            "INVALID_VEHICLE_SUBMISSION_STATUS"
        );
    }

    return {
        items: await listVehicleSubmissions({
            submissionId,
            documentId,
            vehicleId,
            ownerId,
            verified,
            status,
            docCity,
        }),
    };
}

export async function reviewVehicleDocumentSubmissionService({ submissionId, payload }) {
    const numericSubmissionId = Number(submissionId);
    if (!Number.isInteger(numericSubmissionId) || numericSubmissionId < 1) {
        throw new AppError("Invalid submission id.", 422, "INVALID_VEHICLE_SUBMISSION_ID");
    }

    const reviewStatus = String(payload.status || "").trim().toLowerCase();
    if (!["approved", "rejected", "expired"].includes(reviewStatus)) {
        throw new AppError("status must be approved/rejected/expired.", 422, "INVALID_REVIEW_STATUS");
    }

    const existing = await findVehicleSubmissionById(numericSubmissionId);
    if (!existing) {
        throw new AppError("Vehicle submission not found.", 404, "VEHICLE_SUBMISSION_NOT_FOUND");
    }

    const mappedStatus = reviewStatus === "approved" ? "verified" : reviewStatus;
    const mappedVerified = reviewStatus === "approved" ? 1 : 0;
    const reviewNote =
        payload.review_note === undefined || payload.review_note === null ? null : String(payload.review_note).trim();

    await updateVehicleSubmissionReview({
        submissionId: numericSubmissionId,
        verified: mappedVerified,
        status: mappedStatus,
        reviewNote,
    });

    const allDocs = await listVehicleDocuments(existing.vehicle_id);
    const newVehicleStatus = resolveVehicleStatusAfterReview(allDocs);
    await updateVehicleVerificationStatus(existing.vehicle_id, newVehicleStatus);

    return {
        submission: await findVehicleSubmissionById(numericSubmissionId),
        review_status: reviewStatus,
    };
}
