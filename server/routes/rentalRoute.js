import { Router } from "express";
import requireAuth from "../middlewares/authMiddleware.js";
import requireRole from "../middlewares/roleMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
    assignRentalHandler,
    createRentalBookingHandler,
    createRentalPackageHandler,
    getPackageCarsHandler,
    getVehiclePackagesHandler,
    getRentalBookingDetailHandler,
    getNearbyPackagesHandler,
    listOwnerRentalPackagesHandler,
    listRentalBookingsHandler,
    listRentalPackagesHandler,
    listVehicleTypesHandler,
    notifyDriversForRentalHandler,
    rentalMetaHandler,
    setVehiclePackagesHandler,
    updateRentalPackageHandler,
    updateRentalStatusHandler,
} from "../controllers/rentalController.js";
import {
    assignRentalValidator,
    createRentalBookingValidator,
    createRentalPackageValidator,
    nearbyPackagesValidator,
    notifyDriversValidator,
    packageIdParamValidator,
    rentalBookingListValidator,
    rentalIdParamValidator,
    rentalMetaValidator,
    rentalPackageListValidator,
    rentalVehicleIdParamValidator,
    setVehiclePackagesValidator,
    updateRentalPackageValidator,
    updateRentalStatusValidator,
} from "../validators/rentalValidators.js";

const router = Router();

router.get(
    "/api/rentals/vehicle-types",
    requireAuth,
    requireRole("admin"),
    listVehicleTypesHandler
);

router.get(
    "/api/rentals/packages",
    requireAuth,
    rentalPackageListValidator,
    validateRequest,
    listRentalPackagesHandler
);
router.post(
    "/api/rentals/packages",
    requireAuth,
    requireRole("admin"),
    createRentalPackageValidator,
    validateRequest,
    createRentalPackageHandler
);
router.patch(
    "/api/rentals/packages/:packageId",
    requireAuth,
    requireRole("admin"),
    updateRentalPackageValidator,
    validateRequest,
    updateRentalPackageHandler
);

// Owner: gói thuê xe đang active (service_type=1)
router.get(
    "/api/rentals/owner/packages",
    requireAuth,
    requireRole("owner"),
    listOwnerRentalPackagesHandler
);

// Owner: xem/gán gói thuê cho xe của mình
router.get(
    "/api/rentals/owner/vehicles/:vehicleId/packages",
    requireAuth,
    requireRole("owner"),
    rentalVehicleIdParamValidator,
    validateRequest,
    getVehiclePackagesHandler
);
router.put(
    "/api/rentals/owner/vehicles/:vehicleId/packages",
    requireAuth,
    requireRole("owner"),
    setVehiclePackagesValidator,
    validateRequest,
    setVehiclePackagesHandler
);

// Admin: kích hoạt thủ công gửi thông báo cho tài xế của 1 đơn thuê
router.post(
    "/api/rentals/bookings/:rentalId/notify-drivers",
    requireAuth,
    requireRole("admin", "dispatcher"),
    notifyDriversValidator,
    validateRequest,
    notifyDriversForRentalHandler
);

router.get(
    "/api/rentals/meta",
    requireAuth,
    rentalMetaValidator,
    validateRequest,
    rentalMetaHandler
);
router.post(
    "/api/rentals/bookings",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger"),
    createRentalBookingValidator,
    validateRequest,
    createRentalBookingHandler
);
router.get(
    "/api/rentals/bookings",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    rentalBookingListValidator,
    validateRequest,
    listRentalBookingsHandler
);
router.get(
    "/api/rentals/bookings/:rentalId",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    rentalIdParamValidator,
    validateRequest,
    getRentalBookingDetailHandler
);
router.patch(
    "/api/rentals/bookings/:rentalId/status",
    requireAuth,
    requireRole("admin", "dispatcher", "passenger", "driver"),
    updateRentalStatusValidator,
    validateRequest,
    updateRentalStatusHandler
);
router.patch(
    "/api/rentals/bookings/:rentalId/assign",
    requireAuth,
    requireRole("admin", "dispatcher"),
    assignRentalValidator,
    validateRequest,
    assignRentalHandler
);

// ─── Mobile: tìm gói thuê gần vị trí người dùng ─────────────────────────────
// Yêu cầu đăng nhập (passenger), truyền ?lat=&lng= để lọc theo vùng GIS
router.get(
    "/api/mobile/rental-packages/nearby",
    requireAuth,
    requireRole("customer", "admin", "dispatcher"),
    nearbyPackagesValidator,
    validateRequest,
    getNearbyPackagesHandler
);

// ─── Mobile: danh sách xe khả dụng của gói thuê ──────────────────────────────
router.get(
    "/api/mobile/rental-packages/:packageId/cars",
    requireAuth,
    requireRole("customer", "admin", "dispatcher"),
    packageIdParamValidator,
    validateRequest,
    getPackageCarsHandler
);

export default router;

