/**
 * driverAppRoute.js
 *
 * Mount point for all driver mobile-app API endpoints.
 * Pattern mirrors customerRoute.mjs – sub-routers are grouped under /api/driver/...
 *
 * Automatically loaded by index.mjs's dynamic route scanner.
 */

import { Router } from "express";
import driverAuthRoute from "./driver/authRoute.js";
import driverBookingRoute from "./driver/bookingRoute.js";
import driverProfileRoute from "./driver/profileRoute.js";
import driverWalletRoute from "./driver/walletRoute.js";
import driverWorkingStatusRoute from "./driver/workingStatusRoute.js";
import driverLocationRoute from "./driver/locationRoute.js";
import driverTripRoute from "./driver/tripRoute.js";
import driverIncomeRoute from "./driver/incomeRoute.js";
import driverRentalRoute from "./driver/rentalRoute.js";
import driverSupportRoute from "./driver/supportRoute.js";
import driverNotificationRoute from "./driver/notificationRoute.js";
import driverPackagesRoute from "./driver/packagesRoute.js";
import driverRealtimeRoute from "./driver/realtimeRoute.js";

const router = Router();

router.use("/api/driver/auth", driverAuthRoute);
router.use("/api/driver/bookings", driverBookingRoute);
router.use("/api/driver/me", driverProfileRoute);
router.use("/api/driver/wallet", driverWalletRoute);
router.use("/api/driver/working-status", driverWorkingStatusRoute);
router.use("/api/driver/location", driverLocationRoute);
router.use("/api/driver/trips", driverTripRoute);
router.use("/api/driver/income", driverIncomeRoute);
router.use("/api/driver/rental", driverRentalRoute);
router.use("/api/driver/support", driverSupportRoute);
router.use("/api/driver/notifications", driverNotificationRoute);
router.use("/api/driver/packages", driverPackagesRoute);
router.use("/api/driver/realtime", driverRealtimeRoute);

export default router;
