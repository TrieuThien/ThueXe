import { body } from "express-validator";

const couponCodeRegex = /^[A-Za-z0-9_-]{3,15}$/;

export const validateCouponValidator = [
    body("coupon_code")
        .trim()
        .matches(couponCodeRegex)
        .withMessage("coupon_code must be 3-15 chars and contain only letters, numbers, _ or -"),
    body("service_domain")
        .isIn(["ride", "rental"])
        .withMessage("service_domain must be ride or rental"),
    body("booking_amount")
        .isFloat({ min: 0 })
        .withMessage("booking_amount must be a non-negative number")
        .toFloat(),
    body("vehicle_type_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("vehicle_type_id must be a positive integer")
        .toInt(),
];

export const applyCouponValidator = [
    body("coupon_code")
        .trim()
        .matches(couponCodeRegex)
        .withMessage("coupon_code must be 3-15 chars and contain only letters, numbers, _ or -"),
    body("booking_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("booking_id must be a positive integer")
        .toInt(),
    body("rental_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("rental_id must be a positive integer")
        .toInt(),
    body().custom((value, { req }) => {
        const hasBookingId = req.body.booking_id !== undefined && req.body.booking_id !== null && req.body.booking_id !== "";
        const hasRentalId = req.body.rental_id !== undefined && req.body.rental_id !== null && req.body.rental_id !== "";

        if ((hasBookingId && hasRentalId) || (!hasBookingId && !hasRentalId)) {
            throw new Error("Provide either booking_id or rental_id");
        }

        return true;
    }),
];

export const myAvailableCouponsValidator = [];
