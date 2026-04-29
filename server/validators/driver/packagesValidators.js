import { body, param } from "express-validator";

export const selectPackageValidator = [
    body("package_id")
        .isInt({ min: 1 })
        .withMessage("package_id phải là số nguyên dương")
        .toInt(),
    body("price_override")
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage("price_override phải là số không âm")
        .toFloat(),
];

export const enrollmentIdParamValidator = [
    param("enrollmentId")
        .isInt({ min: 1 })
        .withMessage("enrollmentId phải là số nguyên dương")
        .toInt(),
];
