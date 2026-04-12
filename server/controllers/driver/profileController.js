import { successResponse } from "../../utils/apiResponse.js";
import {
    getMyAccountStatus,
    getMyDocuments,
    getMyProfile,
    getRequiredDocuments,
    patchMyBankAccount,
    patchMyPhoto,
    patchMyProfile,
    submitMyDriverDocument,
} from "../../services/driver/profileService.js";

export async function getMyProfileHandler(req, res, next) {
    try {
        const result = await getMyProfile(req.auth);
        return successResponse(res, result, "Profile fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function patchMyProfileHandler(req, res, next) {
    try {
        const result = await patchMyProfile(req.auth, req.body);
        return successResponse(res, result, "Profile updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getMyAccountStatusHandler(req, res, next) {
    try {
        const result = await getMyAccountStatus(req.auth);
        return successResponse(res, result, "Account status fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function patchMyBankAccountHandler(req, res, next) {
    try {
        const result = await patchMyBankAccount(req.auth, req.body);
        return successResponse(res, result, "Bank account updated successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getRequiredDocumentsHandler(req, res, next) {
    try {
        const result = await getRequiredDocuments(req.auth);
        return successResponse(res, result, "Required documents fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function getMyDocumentsHandler(req, res, next) {
    try {
        const result = await getMyDocuments(req.auth);
        return successResponse(res, result, "Documents fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function submitMyDocumentHandler(req, res, next) {
    try {
        const result = await submitMyDriverDocument(req.auth, req.body);
        const statusCode = result.action === "created" ? 201 : 200;
        return successResponse(res, result, "Document submitted successfully", statusCode);
    } catch (error) {
        return next(error);
    }
}

export async function patchMyPhotoHandler(req, res, next) {
    try {
        const result = await patchMyPhoto(req.auth, req.file);
        return successResponse(res, result, "Photo updated successfully");
    } catch (error) {
        return next(error);
    }
}
