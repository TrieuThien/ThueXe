import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    createDocumentDefinitionHandler,
    deleteDocumentDefinitionHandler,
    listAllSubmissionsHandler,
    listDocumentDefinitionsHandler,
    listMySubmissionsHandler,
    listVehicleSubmissionsHandler,
    reviewSubmissionHandler,
    reviewVehicleSubmissionHandler,
    submitMyDocumentHandler,
    updateDocumentDefinitionHandler,
    updateMySubmissionHandler,
} from "../controllers/documentController.js";
import {
    createDocumentDefinitionValidator,
    deleteDocumentDefinitionValidator,
    listAllSubmissionsValidator,
    listDocumentDefinitionsValidator,
    listVehicleSubmissionsValidator,
    reviewSubmissionValidator,
    reviewVehicleSubmissionValidator,
    submitMyDocumentValidator,
    updateDocumentDefinitionValidator,
    updateMySubmissionValidator,
} from "../validators/documentValidators.js";

const router = Router();

router.get(
    "/api/documents/definitions",
    requireAuth,
    listDocumentDefinitionsValidator,
    validateRequest,
    listDocumentDefinitionsHandler
);
router.post(
    "/api/documents/definitions",
    requireAuth,
    requireRole("admin"),
    createDocumentDefinitionValidator,
    validateRequest,
    createDocumentDefinitionHandler
);
router.patch(
    "/api/documents/definitions/:documentId",
    requireAuth,
    requireRole("admin"),
    updateDocumentDefinitionValidator,
    validateRequest,
    updateDocumentDefinitionHandler
);
router.delete(
    "/api/documents/definitions/:documentId",
    requireAuth,
    requireRole("admin"),
    deleteDocumentDefinitionValidator,
    validateRequest,
    deleteDocumentDefinitionHandler
);

router.get("/api/documents/my", requireAuth, listMySubmissionsHandler);
router.post(
    "/api/documents/my",
    requireAuth,
    submitMyDocumentValidator,
    validateRequest,
    submitMyDocumentHandler
);
router.patch(
    "/api/documents/my/:submissionId",
    requireAuth,
    updateMySubmissionValidator,
    validateRequest,
    updateMySubmissionHandler
);

router.get(
    "/api/documents/submissions",
    requireAuth,
    requireRole("admin", "dispatcher"),
    listAllSubmissionsValidator,
    validateRequest,
    listAllSubmissionsHandler
);
router.patch(
    "/api/documents/submissions/:actorType/:submissionId/review",
    requireAuth,
    requireRole("admin"),
    reviewSubmissionValidator,
    validateRequest,
    reviewSubmissionHandler
);

router.get(
    "/api/documents/vehicle-submissions",
    requireAuth,
    requireRole("admin"),
    listVehicleSubmissionsValidator,
    validateRequest,
    listVehicleSubmissionsHandler
);
router.patch(
    "/api/documents/vehicle-submissions/:submissionId/review",
    requireAuth,
    requireRole("admin"),
    reviewVehicleSubmissionValidator,
    validateRequest,
    reviewVehicleSubmissionHandler
);

export default router;
