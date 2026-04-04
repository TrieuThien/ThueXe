import AppError from "../utils/appError.js";
import {
    createDocumentDefinition,
    createSubmission,
    deleteDocumentDefinition,
    findDocumentDefinitionById,
    findSubmissionByActorAndDocument,
    findSubmissionById,
    listAllSubmissions,
    listDocumentDefinitions,
    listMySubmissions,
    setSubmissionVerification,
    updateDocumentDefinition,
    updateSubmission,
} from "../repositories/documentRepository.js";

function getMyActorType(auth) {
    return auth.role === "driver" ? "driver" : "user";
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

export async function getDocumentDefinitions({ query }) {
    const status = query.status === undefined || query.status === "" ? undefined : Number(query.status);
    const docUser = query.doc_user === undefined || query.doc_user === "" ? undefined : Number(query.doc_user);
    const docType = query.doc_type === undefined || query.doc_type === "" ? undefined : Number(query.doc_type);
    const docCity = query.doc_city === undefined || query.doc_city === "" ? undefined : Number(query.doc_city);
    return {
        items: await listDocumentDefinitions({ status, docUser, docType, docCity }),
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
    if (actorType && !["user", "driver"].includes(actorType)) {
        throw new AppError("actor_type must be user or driver.", 422, "INVALID_ACTOR_TYPE");
    }
    return {
        items: await listAllSubmissions({ actorType, verified }),
    };
}

export async function reviewDocumentSubmission({ actorType, submissionId, payload }) {
    const normalizedActorType = String(actorType || "").trim();
    if (!["user", "driver"].includes(normalizedActorType)) {
        throw new AppError("actorType must be user or driver.", 422, "INVALID_ACTOR_TYPE");
    }
    const numericSubmissionId = Number(submissionId);
    if (!Number.isInteger(numericSubmissionId) || numericSubmissionId < 1) {
        throw new AppError("Invalid submission id.", 422, "INVALID_SUBMISSION_ID");
    }

    const status = String(payload.status || "").trim().toLowerCase();
    if (!["approved", "rejected", "expired"].includes(status)) {
        throw new AppError("status must be approved/rejected/expired.", 422, "INVALID_REVIEW_STATUS");
    }

    const existing = await findSubmissionById({
        actorType: normalizedActorType,
        submissionId: numericSubmissionId,
    });
    if (!existing) {
        throw new AppError("Submission not found.", 404, "SUBMISSION_NOT_FOUND");
    }
    let verified = 0;
    if (status === "approved") verified = 1;
    if (status === "rejected") verified = 0;
    if (status === "expired") verified = 0;
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

