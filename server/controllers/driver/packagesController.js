import { successResponse } from "../../utils/apiResponse.js";
import {
    getDriverPackages,
    selectDriverPackage,
    removeDriverPackage,
    getDriverActivePackages,
} from "../../services/driver/packagesService.js";

export async function getDriverPackagesHandler(req, res, next) {
    try {
        const result = await getDriverPackages(req.auth);
        return successResponse(res, result, "Danh sách gói thuê tài xế");
    } catch (error) {
        return next(error);
    }
}

export async function selectDriverPackageHandler(req, res, next) {
    try {
        const result = await selectDriverPackage(req.auth, req.body);
        return successResponse(res, result, "Đăng ký gói thành công", 201);
    } catch (error) {
        return next(error);
    }
}

export async function removeDriverPackageHandler(req, res, next) {
    try {
        const result = await removeDriverPackage(req.auth, req.params.enrollmentId);
        return successResponse(res, result, "Đã ngừng bán gói");
    } catch (error) {
        return next(error);
    }
}

export async function getDriverActivePackagesHandler(req, res, next) {
    try {
        const result = await getDriverActivePackages(req.auth);
        return successResponse(res, result, "Gói đang bán");
    } catch (error) {
        return next(error);
    }
}
