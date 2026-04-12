import { Router } from "express";
import requireAuth from "../../middlewares/authMiddleware.js";
import requireRole from "../../middlewares/roleMiddleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { uploadSingleMemoryImage } from "../../middlewares/uploadMemoryImage.js";
import {
    getMyAccountStatusHandler,
    getMyDocumentsHandler,
    getMyProfileHandler,
    getRequiredDocumentsHandler,
    patchMyBankAccountHandler,
    patchMyPhotoHandler,
    patchMyProfileHandler,
    submitMyDocumentHandler,
} from "../../controllers/driver/profileController.js";
import {
    patchBankAccountValidator,
    patchMeValidator,
    submitDriverDocumentValidator,
} from "../../validators/driver/profileValidators.js";

const router = Router();

// All profile endpoints require an authenticated driver
router.use(requireAuth, requireRole("driver"));

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get("/", getMyProfileHandler);
router.patch("/", patchMeValidator, validateRequest, patchMyProfileHandler);
router.get("/account-status", getMyAccountStatusHandler);
router.patch("/bank-account", patchBankAccountValidator, validateRequest, patchMyBankAccountHandler);

// ─── Documents ────────────────────────────────────────────────────────────────
router.get("/documents-required", getRequiredDocumentsHandler);
router.get("/documents", getMyDocumentsHandler);
router.post("/documents", submitDriverDocumentValidator, validateRequest, submitMyDocumentHandler);

// ─── Photo ────────────────────────────────────────────────────────────────────
// uploadSingleMemoryImage handles multipart/form-data and writes file to req.file
router.patch("/photo", uploadSingleMemoryImage("photo"), patchMyPhotoHandler);

export default router;
