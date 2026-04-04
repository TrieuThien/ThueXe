import { successResponse } from "../utils/apiResponse.js";
import {
    createDocumentDefinitionService,
    deleteDocumentDefinitionService,
    getDocumentDefinitions,
    listAllDocumentSubmissionsService,
    listMyDocumentSubmissions,
    reviewDocumentSubmission,
    submitMyDocument,
    updateDocumentDefinitionService,
    updateMySubmission,
} from "../services/documentService.js";

export async function listDocumentDefinitionsHandler(req, res, next) {
    try {
        const result = await getDocumentDefinitions({ query: req.query });
        return successResponse(res, result, "Document definitions fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function createDocumentDefinitionHandler(req, res, next) {
    try {
        const result = await createDocumentDefinitionService({ payload: req.body });
        return successResponse(res, result, "Document definition created successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateDocumentDefinitionHandler(req, res, next) {
    try {
        const result = await updateDocumentDefinitionService({
            documentId: req.params.documentId,
            payload: req.body,
        });
        return successResponse(res, result, "Document definition updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function deleteDocumentDefinitionHandler(req, res, next) {
    try {
        const result = await deleteDocumentDefinitionService({ documentId: req.params.documentId });
        return successResponse(res, result, "Document definition deleted successfully");
    } catch (error) {
        return next(error);
    }
}

export async function listMySubmissionsHandler(req, res, next) {
    try {
        const result = await listMyDocumentSubmissions({ auth: req.auth });
        return successResponse(res, result, "My document submissions fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function submitMyDocumentHandler(req, res, next) {
    try {
        const result = await submitMyDocument({ auth: req.auth, payload: req.body });
        return successResponse(res, result, "Document submitted successfully", 201);
    } catch (error) {
        return next(error);
    }
}

export async function updateMySubmissionHandler(req, res, next) {
    try {
        const result = await updateMySubmission({
            auth: req.auth,
            submissionId: req.params.submissionId,
            payload: req.body,
        });
        return successResponse(res, result, "Document submission updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function listAllSubmissionsHandler(req, res, next) {
    try {
        const result = await listAllDocumentSubmissionsService({ query: req.query });
        return successResponse(res, result, "Document submissions fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function reviewSubmissionHandler(req, res, next) {
    try {
        const result = await reviewDocumentSubmission({
            actorType: req.params.actorType,
            submissionId: req.params.submissionId,
            payload: req.body,
        });
        return successResponse(res, result, "Document submission reviewed successfully");
    } catch (error) {
        return next(error);
    }
}

