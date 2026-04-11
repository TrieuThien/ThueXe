import { body, param, query } from "express-validator";

export const listDocumentDefinitionsValidator = [
    query("id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("id must be a positive integer").toInt(),
    query("document_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("document_id must be a positive integer").toInt(),
    query("status").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("status must be 0 or 1").toInt(),
    query("doc_user").optional({ values: "falsy" }).isIn([0, 1, 2, "0", "1", "2"]).withMessage("doc_user must be 0,1,2").toInt(),
    query("doc_type").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("doc_type must be 0 or 1").toInt(),
    query("doc_city").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("doc_city must be a positive integer").toInt(),
];

export const createDocumentDefinitionValidator = [
    body("title").trim().isLength({ min: 2, max: 255 }).withMessage("title must be between 2 and 255 characters"),
    body("doc_desc").trim().isLength({ min: 2, max: 1000 }).withMessage("doc_desc must be between 2 and 1000 characters"),
    body("doc_city").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("doc_city must be a positive integer").toInt(),
    body("doc_type").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("doc_type must be 0 or 1").toInt(),
    body("doc_user").optional({ values: "falsy" }).isIn([0, 1, 2, "0", "1", "2"]).withMessage("doc_user must be 0,1,2").toInt(),
    body("doc_expiry").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("doc_expiry must be 0 or 1").toInt(),
    body("doc_id_num").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("doc_id_num must be 0 or 1").toInt(),
    body("doc_id_num_title").optional({ values: "falsy" }).trim().isLength({ max: 255 }).withMessage("doc_id_num_title must not exceed 255 characters"),
    body("doc_id_num_desc").optional({ values: "falsy" }).trim().isLength({ max: 1000 }).withMessage("doc_id_num_desc must not exceed 1000 characters"),
    body("status").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("status must be 0 or 1").toInt(),
];

export const updateDocumentDefinitionValidator = [
    param("documentId").isInt({ min: 1 }).withMessage("documentId must be a positive integer").toInt(),
    ...createDocumentDefinitionValidator,
];

export const deleteDocumentDefinitionValidator = [
    param("documentId").isInt({ min: 1 }).withMessage("documentId must be a positive integer").toInt(),
];

export const submitMyDocumentValidator = [
    body("document_id").isInt({ min: 1 }).withMessage("document_id must be a positive integer").toInt(),
    body("doc_number").optional({ values: "falsy" }).trim().isLength({ max: 100 }).withMessage("doc_number must not exceed 100 characters"),
    body("doc_expiry_date").optional({ values: "falsy" }).isDate().withMessage("doc_expiry_date must be valid date YYYY-MM-DD"),
];

export const updateMySubmissionValidator = [
    param("submissionId").isInt({ min: 1 }).withMessage("submissionId must be a positive integer").toInt(),
    body("doc_number").optional({ values: "falsy" }).trim().isLength({ max: 100 }).withMessage("doc_number must not exceed 100 characters"),
    body("doc_expiry_date").optional({ values: "falsy" }).isDate().withMessage("doc_expiry_date must be valid date YYYY-MM-DD"),
];

export const listAllSubmissionsValidator = [
    query("id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("id must be a positive integer").toInt(),
    query("document_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("document_id must be a positive integer").toInt(),
    query("actor_type").optional({ values: "falsy" }).isIn(["user", "driver"]).withMessage("actor_type must be user or driver"),
    query("verified").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("verified must be 0 or 1").toInt(),
];

export const reviewSubmissionValidator = [
    param("actorType").isIn(["user", "driver"]).withMessage("actorType must be user or driver"),
    param("submissionId").isInt({ min: 1 }).withMessage("submissionId must be a positive integer").toInt(),
    body("status").isIn(["approved", "rejected", "expired"]).withMessage("status must be approved/rejected/expired"),
];

export const listVehicleSubmissionsValidator = [
    query("id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("id must be a positive integer").toInt(),
    query("document_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("document_id must be a positive integer").toInt(),
    query("vehicle_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("vehicle_id must be a positive integer").toInt(),
    query("owner_id").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("owner_id must be a positive integer").toInt(),
    query("verified").optional({ values: "falsy" }).isIn([0, 1, "0", "1"]).withMessage("verified must be 0 or 1").toInt(),
    query("status")
        .optional({ values: "falsy" })
        .isIn(["missing", "pending", "verified", "rejected", "expired"])
        .withMessage("status must be missing|pending|verified|rejected|expired"),
    query("doc_city").optional({ values: "falsy" }).isInt({ min: 1 }).withMessage("doc_city must be a positive integer").toInt(),
];

export const reviewVehicleSubmissionValidator = [
    param("submissionId").isInt({ min: 1 }).withMessage("submissionId must be a positive integer").toInt(),
    body("status").isIn(["approved", "rejected", "expired"]).withMessage("status must be approved/rejected/expired"),
    body("review_note")
        .optional({ values: "falsy" })
        .isString()
        .trim()
        .isLength({ max: 255 })
        .withMessage("review_note must not exceed 255 characters"),
];
