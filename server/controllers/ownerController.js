import { ownerPaginated, ownerSuccess } from "../utils/ownerApiResponse.js";
import { verifyMomoIpnSignature } from "../services/payment/momoService.js";
import {
    changeOwnerPassword,
    toggleVehicleOperationStatus,
    createOwnerAvailabilityBlock,
    createOwnerMaintenance,
    createOwnerRevenueTopup,
    createOwnerRevenueWithdrawal,
    processOwnerMomoTopupIpn,
    createOwnerVehicleService,
    deleteOwnerAvailabilityBlock,
    deleteOwnerMaintenanceService,
    getOwnerAccountProfile,
    getOwnerAccountSummary,
    getOwnerActivityVehicleLocations,
    getOwnerActivityVehicles,
    getOwnerBookingContractDetail,
    getOwnerBookingDetail,
    getOwnerDashboard,
    getOwnerMaintenanceDetail,
    getOwnerMaintenanceStats,
    getOwnerMaintenanceVehicles,
    getOwnerRevenueByVehicleService,
    getOwnerRevenueSummary,
    getOwnerRevenueWallet,
    getOwnerTimeline,
    getOwnerVehicleAvailability,
    getOwnerVehicleDetailService,
    getOwnerVehicleDocumentTypes,
    getOwnerVehiclesService,
    getOwnerVehicleTypes,
    getOwnerVehicleVerificationStatusService,
    getOwnerVerificationRequiredDocuments,
    getOwnerVerificationStatus,
    getOwnerVerificationSubmission,
    listOwnerBookingContracts,
    listOwnerBookings,
    listOwnerMaintenance,
    listOwnerRevenueLedger,
    listOwnerRevenuePayments,
    listOwnerRevenueWithdrawals,
    ownerLogin,
    ownerLogout,
    ownerRefreshToken,
    ownerRegister,
    submitOwnerVerification,
    updateOwnerAccountProfile,
    updateOwnerBookingStatus,
    updateOwnerMaintenanceService,
    updateOwnerVehicleService,
    updateOwnerVerificationDocument,
    updateVehiclePhotoService,
    uploadOwnerVerificationDocument,
    upsertOwnerVehicleDocumentsService,
    verifyOwnerRegisterEmailToken,
} from "../services/ownerService.js";

function requestMeta(req) {
    return { requestId: req.headers["x-request-id"] || "" };
}

function ownerVerifyEmailHtml({ success, title, message, actionHref = "/owner/login", actionLabel = "Đến trang đăng nhập" }) {
    const statusColor = success ? "#15803d" : "#b91c1c";
    const badge = success ? "Xác thực thành công" : "Xác thực thất bại";
    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
    <p style="display:inline-block;margin:0 0 12px;color:${statusColor};font-weight:700;">${badge}</p>
    <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">${title}</h1>
    <p style="margin:0 0 18px;color:#334155;line-height:1.55;">${message}</p>
    <a href="${actionHref}" style="display:inline-block;background:#0369a1;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700;">${actionLabel}</a>
  </div>
</body>
</html>`;
}

export async function ownerRegisterHandler(req, res, next) {
    try {
        const data = await ownerRegister(req.body);
        return ownerSuccess(res, data, requestMeta(req), 201);
    } catch (error) {
        return next(error);
    }
}

export async function ownerVerifyEmailHandler(req, res, next) {
    try {
        const data = await verifyOwnerRegisterEmailToken(req.query?.token || "");
        const redirectUrl = process.env.OWNER_REGISTER_VERIFY_SUCCESS_URL || "/owner/login";
        return res
            .status(200)
            .type("html")
            .send(
                ownerVerifyEmailHtml({
                    success: true,
                    title: "Tài khoản đã được kích hoạt",
                    message: data.message,
                    actionHref: redirectUrl,
                })
            );
    } catch (error) {
        if (error?.isOperational) {
            const redirectUrl = process.env.OWNER_REGISTER_VERIFY_FAIL_URL || "/owner/register";
            return res
                .status(error.statusCode || 400)
                .type("html")
                .send(
                    ownerVerifyEmailHtml({
                        success: false,
                        title: "không thể xác thực email",
                        message: error.message,
                        actionHref: redirectUrl,
                        actionLabel: "Đăng ký lại",
                    })
                );
        }
        return next(error);
    }
}

export async function ownerLoginHandler(req, res, next) {
    try {
        const data = await ownerLogin(req.body);
        return ownerSuccess(res, data, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerRefreshHandler(req, res, next) {
    try {
        const token = req.body?.refreshToken || "";
        const data = await ownerRefreshToken(token);
        return ownerSuccess(res, data, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerLogoutHandler(req, res, next) {
    try {
        const token = req.body?.refreshToken || "";
        const data = await ownerLogout(req.auth, token);
        return ownerSuccess(res, data, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVerificationStatusHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerVerificationStatus(req.auth), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVerificationRequiredDocsHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerVerificationRequiredDocuments(), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVerificationSubmissionHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerVerificationSubmission(req.auth), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVerificationUploadHandler(req, res, next) {
    try {
        return ownerSuccess(res, await uploadOwnerVerificationDocument(req.auth, req.body, req.file), requestMeta(req), 201);
    } catch (error) {
        return next(error);
    }
}

export async function ownerVerificationUpdateHandler(req, res, next) {
    try {
        return ownerSuccess(
            res,
            await updateOwnerVerificationDocument(req.auth, req.params.documentTypeId, req.body, req.file),
            requestMeta(req)
        );
    } catch (error) {
        return next(error);
    }
}

export async function ownerVerificationSubmitHandler(req, res, next) {
    try {
        return ownerSuccess(res, await submitOwnerVerification(req.auth), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerAccountProfileHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerAccountProfile(req.auth), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerAccountUpdateHandler(req, res, next) {
    try {
        return ownerSuccess(res, await updateOwnerAccountProfile(req.auth, req.body), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerAccountChangePasswordHandler(req, res, next) {
    try {
        return ownerSuccess(res, await changeOwnerPassword(req.auth, req.body), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerAccountSummaryHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerAccountSummary(req.auth), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerDashboardHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerDashboard(req.auth), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleTypesHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerVehicleTypes(), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleDocumentTypesHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerVehicleDocumentTypes(), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleCreateHandler(req, res, next) {
    try {
        return ownerSuccess(res, await createOwnerVehicleService(req.auth, req.body, req.files || []), requestMeta(req), 201);
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleListHandler(req, res, next) {
    try {
        const result = await getOwnerVehiclesService(req.auth, req.query);
        return ownerPaginated(res, result.items, result, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleDetailHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerVehicleDetailService(req.auth, req.params.vehicleId), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleUpdateHandler(req, res, next) {
    try {
        return ownerSuccess(res, await updateOwnerVehicleService(req.auth, req.params.vehicleId, req.body), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehiclePhotoUpdateHandler(req, res, next) {
    try {
        const photoFile = (req.files || []).find((f) => f.fieldname === "vehicle_photo") || req.file || null;
        return ownerSuccess(res, await updateVehiclePhotoService(req.auth, req.params.vehicleId, photoFile), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleDocumentsUpsertHandler(req, res, next) {
    try {
        return ownerSuccess(res, await upsertOwnerVehicleDocumentsService(req.auth, req.params.vehicleId, req.body, req.files || []), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleVerificationStatusHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerVehicleVerificationStatusService(req.auth, req.params.vehicleId), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerActivityVehiclesHandler(req, res, next) {
    try {
        const result = await getOwnerActivityVehicles(req.auth, req.query);
        return ownerPaginated(res, result.items, result, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerActivityVehicleLocationsHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerActivityVehicleLocations(req.auth, req.query), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerActivityAvailabilityHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerVehicleAvailability(req.auth, req.params.vehicleId, req.query), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerActivityAvailabilityCreateHandler(req, res, next) {
    try {
        return ownerSuccess(res, await createOwnerAvailabilityBlock(req.auth, req.params.vehicleId, req.body), requestMeta(req), 201);
    } catch (error) {
        return next(error);
    }
}

export async function ownerActivityAvailabilityDeleteHandler(req, res, next) {
    try {
        await deleteOwnerAvailabilityBlock(req.auth, req.params.vehicleId, req.params.blockId);
        return ownerSuccess(res, true, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerActivityTimelineHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerTimeline(req.auth, req.query), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleToggleOperationStatusHandler(req, res, next) {
    try {
        return ownerSuccess(res, await toggleVehicleOperationStatus(req.auth, req.params.vehicleId), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerMaintenanceVehiclesHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerMaintenanceVehicles(req.auth), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerMaintenanceListHandler(req, res, next) {
    try {
        const result = await listOwnerMaintenance(req.auth, req.query);
        return ownerPaginated(res, result.items, result, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerMaintenanceDetailHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerMaintenanceDetail(req.auth, req.params.recordId), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerMaintenanceCreateHandler(req, res, next) {
    try {
        return ownerSuccess(res, await createOwnerMaintenance(req.auth, req.body), requestMeta(req), 201);
    } catch (error) {
        return next(error);
    }
}

export async function ownerMaintenanceUpdateHandler(req, res, next) {
    try {
        return ownerSuccess(res, await updateOwnerMaintenanceService(req.auth, req.params.recordId, req.body), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerMaintenanceDeleteHandler(req, res, next) {
    try {
        await deleteOwnerMaintenanceService(req.auth, req.params.recordId);
        return ownerSuccess(res, true, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerMaintenanceStatsHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerMaintenanceStats(req.auth, req.query), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerBookingListHandler(req, res, next) {
    try {
        const result = await listOwnerBookings(req.auth, req.query);
        return ownerPaginated(res, result.items, result, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerBookingDetailHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerBookingDetail(req.auth, req.params.bookingId), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerBookingStatusUpdateHandler(req, res, next) {
    try {
        return ownerSuccess(res, await updateOwnerBookingStatus(req.auth, req.params.bookingId, req.body), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerBookingContractsListHandler(req, res, next) {
    try {
        return ownerSuccess(res, await listOwnerBookingContracts(req.auth, req.query), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerBookingContractDetailHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerBookingContractDetail(req.auth, req.params.contractId), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerRevenueSummaryHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerRevenueSummary(req.auth, req.query), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerRevenueByVehicleHandler(req, res, next) {
    try {
        const result = await getOwnerRevenueByVehicleService(req.auth, req.query);
        return ownerPaginated(res, result.items, result, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerRevenueWalletHandler(req, res, next) {
    try {
        return ownerSuccess(res, await getOwnerRevenueWallet(req.auth), requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerRevenueLedgerHandler(req, res, next) {
    try {
        const result = await listOwnerRevenueLedger(req.auth, req.query);
        return ownerPaginated(res, result.items, result, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerRevenuePaymentsHandler(req, res, next) {
    try {
        const result = await listOwnerRevenuePayments(req.auth, req.query);
        return ownerPaginated(res, result.items, result, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerRevenueWithdrawalsHandler(req, res, next) {
    try {
        const result = await listOwnerRevenueWithdrawals(req.auth, req.query);
        return ownerPaginated(res, result.items, result, requestMeta(req));
    } catch (error) {
        return next(error);
    }
}

export async function ownerRevenueCreateWithdrawalHandler(req, res, next) {
    try {
        const data = await createOwnerRevenueWithdrawal(req.auth, req.body, req.headers["idempotency-key"] || "");
        return ownerSuccess(res, data, requestMeta(req), 201);
    } catch (error) {
        return next(error);
    }
}

export async function ownerRevenueTopupHandler(req, res, next) {
    try {
        const data = await createOwnerRevenueTopup(req.auth, req.body, req.headers["idempotency-key"] || "");
        return ownerSuccess(res, data, requestMeta(req), 201);
    } catch (error) {
        return next(error);
    }
}

// MoMo IPN cho owner topup (server-to-server, không cần auth)
export async function ownerMomoIpnHandler(req, res, next) {
    try {
        const isValid = verifyMomoIpnSignature(req.body);
        if (!isValid) {
            return res.status(400).json({ resultCode: 1, message: "Invalid signature" });
        }
        await processOwnerMomoTopupIpn({
            orderId: req.body.orderId,
            resultCode: req.body.resultCode,
            transId: req.body.transId,
            message: req.body.message,
        });
        return res.status(200).json({ resultCode: 0, message: "ok" });
    } catch (error) {
        next(error);
    }
}

// ─── Rental packages (owner-facing) ──────────────────────────────────────────

import {
    getVehiclePackagesService,
    listOwnerRentalPackagesService,
    setVehiclePackagesService,
} from "../services/rentalService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function ownerRentalPackagesListHandler(req, res, next) {
    try {
        const result = await listOwnerRentalPackagesService();
        return successResponse(res, result, "Rental packages fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleRentalPackagesGetHandler(req, res, next) {
    try {
        const result = await getVehiclePackagesService({
            ownerId: req.auth.userId,
            vehicleId: req.params.vehicleId,
        });
        return successResponse(res, result, "Vehicle rental packages fetched successfully");
    } catch (error) {
        return next(error);
    }
}

export async function ownerVehicleRentalPackagesSetHandler(req, res, next) {
    try {
        const result = await setVehiclePackagesService({
            ownerId: req.auth.userId,
            vehicleId: req.params.vehicleId,
            packageIds: req.body.package_ids,
        });
        return successResponse(res, result, "Vehicle rental packages updated successfully");
    } catch (error) {
        return next(error);
    }
}
