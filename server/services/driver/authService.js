import sqldb from "../../config/sqldatabase.js";
import AppError from "../../utils/appError.js";
import { CODE_CONTEXT, USER_TYPE } from "../../utils/authRole.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import {
    generateCodeToken,
    signAccessToken,
    signRefreshToken,
    signResetToken,
    verifyRefreshToken,
    verifyResetToken,
} from "../../utils/token.js";
import { sendDriverActivationEmail, sendPasswordResetEmail } from "../emailService.js";
import {
    consumeDriverAccountCode,
    createSessionToken,
    deleteAllDriverSessions,
    deleteSessionToken,
    emailExistsAnyAccount,
    findDriverById,
    findDriverByIdentifier,
    findDriverByPhone,
    findDriverPasswordHash,
    findSessionToken,
    insertDriverAccount,
    phoneExistsAnyAccount,
    replaceDriverAccountCode,
    setDriverActivated,
    updateDriverAddress,
    updateDriverLastLogin,
    updateDriverPassword,
    updateDriverPushToken,
} from "../../repositories/driver/authRepository.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeText(value) {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s.length > 0 ? s : null;
}

function normalizeIdentifier(identifier) {
    const value = normalizeText(identifier);
    if (!value) return "";
    return value.includes("@") ? value.toLowerCase() : value;
}

function normalizeEmail(email) {
    const value = normalizeText(email);
    return value ? value.toLowerCase() : null;
}

/**
 * Shape returned to the client for the authenticated driver.
 */
function toDriverProfile(driver) {
    return {
        id: driver.id,
        driver_id: driver.driver_id,
        firstname: driver.firstname,
        lastname: driver.lastname,
        email: driver.email,
        phone: driver.phone,
        photo_file: driver.photo_file,
        drv_address: driver.drv_address,
        drv_country: driver.drv_country,
        car_model: driver.car_model,
        car_plate_num: driver.car_plate_num,
        car_color: driver.car_color,
        car_year: driver.car_year,
        ride_id: driver.ride_id,
        ride_type: driver.ride_type,
        reg_route_id: driver.reg_route_id,
        route_id: driver.route_id,
        route_name: driver.route_name,
        driver_rating: driver.driver_rating,
        completed_rides: driver.completed_rides,
        cancelled_rides: driver.cancelled_rides,
        reward_points: driver.reward_points,
        available: driver.available,
        operation_status: driver.operation_status,
        available_for_rental: driver.available_for_rental,
        hourly_rate: driver.hourly_rate,
        daily_rate: driver.daily_rate,
        push_notification_token: driver.push_notification_token,
        country_code: driver.country_code,
        country_dial_code: driver.country_dial_code,
        is_activated: driver.is_activated,
        account_active: driver.account_active,
        allow_photo_edit: driver.allow_photo_edit,
        allow_vehicle_edit: driver.allow_vehicle_edit,
        allow_city_edit: driver.allow_city_edit,
        disp_lang: driver.disp_lang,
        account_create_date: driver.account_create_date,
        role: "driver",
        userType: USER_TYPE.DRIVER,
    };
}

function assertDriverCanAuthenticate(driver) {
    if (!driver || driver.account_deleted === 1 || driver.accountDeleted === 1) {
        throw new AppError(
            "Unable to authenticate with provided credentials.",
            401,
            "INVALID_CREDENTIALS"
        );
    }

    if ((driver.is_activated ?? driver.isActivated) !== 1) {
        throw new AppError("Account is not activated.", 403, "ACCOUNT_NOT_ACTIVATED");
    }

    if ((driver.account_active ?? driver.accountActive) !== 1) {
        throw new AppError("Account is inactive.", 403, "ACCOUNT_INACTIVE");
    }
}

async function issueTokenPair(driverId, conn) {
    const refreshTokenId = generateCodeToken(10);

    const accessToken = signAccessToken({
        sub: driverId,
        role: "driver",
        userType: USER_TYPE.DRIVER,
        accountType: null,
    });

    const refreshToken = signRefreshToken({
        sub: driverId,
        role: "driver",
        userType: USER_TYPE.DRIVER,
        accountType: null,
        tid: refreshTokenId,
    });

    await createSessionToken({ token: refreshTokenId, userId: driverId }, conn);

    return { accessToken, refreshToken, tokenType: "Bearer" };
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function loginDriver(payload) {
    const identifier = normalizeIdentifier(payload.identifier);

    if (!identifier) {
        throw new AppError(
            "Unable to authenticate with provided credentials.",
            401,
            "INVALID_CREDENTIALS"
        );
    }

    const driverAuth = await findDriverByIdentifier(identifier);

    if (!driverAuth) {
        throw new AppError(
            "Unable to authenticate with provided credentials.",
            401,
            "INVALID_CREDENTIALS"
        );
    }

    const passwordOk = await verifyPassword(payload.password, driverAuth.passwordHash);

    if (!passwordOk) {
        throw new AppError(
            "Unable to authenticate with provided credentials.",
            401,
            "INVALID_CREDENTIALS"
        );
    }

    assertDriverCanAuthenticate(driverAuth);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        await updateDriverLastLogin(driverAuth.id, conn);
        const tokens = await issueTokenPair(driverAuth.id, conn);

        await conn.commit();

        const driver = await findDriverById(driverAuth.id);

        return { driver: toDriverProfile(driver), ...tokens };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function refreshDriverToken(refreshTokenValue) {
    let decoded;
    try {
        decoded = verifyRefreshToken(refreshTokenValue);
    } catch {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    const tokenId = String(decoded.tid || "");
    const driverId = Number(decoded.sub);
    const userType = Number(decoded.userType);

    if (!tokenId || !driverId || userType !== USER_TYPE.DRIVER) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    const session = await findSessionToken(tokenId, driverId);

    if (!session) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    const driver = await findDriverById(driverId);

    if (!driver) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    assertDriverCanAuthenticate(driver);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        await deleteSessionToken(tokenId, driverId, conn);
        const tokens = await issueTokenPair(driverId, conn);

        await conn.commit();

        return { driver: toDriverProfile(driver), ...tokens };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function logoutDriver(refreshTokenValue) {
    const token = String(refreshTokenValue || "");

    if (!token) {
        return { message: "Logged out successfully." };
    }

    try {
        const decoded = verifyRefreshToken(token);
        const tokenId = String(decoded.tid || "");
        const driverId = Number(decoded.sub);
        const userType = Number(decoded.userType);

        if (tokenId && driverId && userType === USER_TYPE.DRIVER) {
            await deleteSessionToken(tokenId, driverId);
        }
    } catch {
        // Always succeed – do not leak token validity
    }

    return { message: "Logged out successfully." };
}

export async function getDriverProfile(auth) {
    const driver = await findDriverById(Number(auth.userId));

    if (!driver || driver.account_deleted === 1) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }

    return { driver: toDriverProfile(driver) };
}

export async function patchDriverPushToken(auth, payload) {
    const driverId = Number(auth.userId);

    const updated = await updateDriverPushToken(driverId, payload.pushNotificationToken);

    if (!updated) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }

    const driver = await findDriverById(driverId);
    return { driver: toDriverProfile(driver) };
}

export async function patchDriverAddress(auth, payload) {
    const driverId = Number(auth.userId);

    await updateDriverAddress(driverId, normalizeText(payload.drv_address));

    const driver = await findDriverById(driverId);

    if (!driver || driver.account_deleted === 1) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }

    return { driver: toDriverProfile(driver) };
}

export async function changeDriverPassword(auth, payload) {
    const driverId = Number(auth.userId);

    const currentHash = await findDriverPasswordHash(driverId);

    if (!currentHash) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }

    const oldPasswordOk = await verifyPassword(payload.old_password, currentHash);

    if (!oldPasswordOk) {
        throw new AppError("Current password is incorrect.", 400, "WRONG_CURRENT_PASSWORD");
    }

    const newHash = await hashPassword(payload.new_password);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        await updateDriverPassword(driverId, newHash, conn);
        await deleteAllDriverSessions(driverId, conn);

        await conn.commit();

        return { message: "Password changed successfully." };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function forgotDriverPassword(payload) {
    const email = normalizeEmail(payload.email);

    if (!email) {
        return {
            message:
                "If the email exists in our system, password reset instructions will be sent shortly.",
        };
    }

    // Look up driver by email
    const driverAuth = await findDriverByIdentifier(email);

    if (!driverAuth || !driverAuth.email) {
        return {
            message:
                "If the email exists in our system, password reset instructions will be sent shortly.",
        };
    }

    const resetCode = generateCodeToken(10);
    const resetToken = signResetToken({
        sub: driverAuth.id,
        userType: USER_TYPE.DRIVER,
        tid: resetCode,
        purpose: "password-reset",
    });

    await replaceDriverAccountCode({
        driverId: driverAuth.id,
        context: CODE_CONTEXT.RESET_PASSWORD,
        code: resetCode,
    });

    const resetLink = `${process.env.PASSWORD_RESET_URL || "http://localhost:5174/reset-password"}?token=${encodeURIComponent(resetToken)}`;

    await sendPasswordResetEmail({ toEmail: driverAuth.email, resetLink });

    return {
        message:
            "If the email exists in our system, password reset instructions will be sent shortly.",
    };
}

export async function resetDriverPassword(payload) {
    let decoded;
    try {
        decoded = verifyResetToken(payload.token);
    } catch {
        throw new AppError("Invalid or expired reset token.", 400, "INVALID_RESET_TOKEN");
    }

    if (decoded.purpose !== "password-reset" || Number(decoded.userType) !== USER_TYPE.DRIVER) {
        throw new AppError("Invalid or expired reset token.", 400, "INVALID_RESET_TOKEN");
    }

    const driverId = Number(decoded.sub);
    const resetCode = String(decoded.tid || "");

    if (!driverId || !resetCode) {
        throw new AppError("Invalid or expired reset token.", 400, "INVALID_RESET_TOKEN");
    }

    const newHash = await hashPassword(payload.new_password);

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const consumed = await consumeDriverAccountCode(
            { driverId, context: CODE_CONTEXT.RESET_PASSWORD, code: resetCode },
            conn
        );

        if (!consumed) {
            throw new AppError("Invalid or expired reset token.", 400, "INVALID_RESET_TOKEN");
        }

        await updateDriverPassword(driverId, newHash, conn);
        await deleteAllDriverSessions(driverId, conn);

        await conn.commit();

        return { message: "Password has been reset successfully." };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ─── Self-registration flow ───────────────────────────────────────────────────

/**
 * Register a new driver account.
 *
 * - Checks email/phone uniqueness across both users and drivers tables.
 * - Creates driver with is_activated=0 (needs OTP) and account_active=1.
 * - Generates a 6-digit OTP stored in driver_account_codes (context=ACTIVATION).
 * - Issues token pair immediately so the app can call verify-otp with auth.
 * - Sends activation email if email provided (non-fatal if mail not configured).
 */
export async function registerDriver(payload) {
    const email = normalizeEmail(payload.email);
    const phone = normalizeText(payload.phone);

    if (!email && !phone) {
        throw new AppError("Either email or phone is required.", 422, "INVALID_IDENTIFIER");
    }

    // Uniqueness check across ALL account types to prevent collision
    const [emailTaken, phoneTaken] = await Promise.all([
        email ? emailExistsAnyAccount(email) : Promise.resolve(false),
        phone ? phoneExistsAnyAccount(phone) : Promise.resolve(false),
    ]);

    if (emailTaken) {
        throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_USED");
    }
    if (phoneTaken) {
        throw new AppError("Phone is already in use.", 409, "PHONE_ALREADY_USED");
    }

    const passwordHash = await hashPassword(payload.password);
    // 6-digit numeric OTP stored in driver_account_codes
    const activationCode = String(
        Math.floor(100000 + Math.random() * 900000)
    );

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const driverId = await insertDriverAccount(
            {
                firstname: String(payload.firstname).trim(),
                lastname: String(payload.lastname).trim(),
                email,
                phone,
                passwordHash,
                regRouteId: payload.reg_route_id ? Number(payload.reg_route_id) : 1,
                rideId: payload.ride_id ? Number(payload.ride_id) : 1,
                drvCountry: normalizeText(payload.country) || "Vietnam",
                countryCode: normalizeText(payload.country_code) || "vn",
                countryDialCode: normalizeText(payload.country_dial_code) || "+84",
            },
            conn
        );

        // Store OTP in driver_account_codes
        await replaceDriverAccountCode(
            { driverId, context: CODE_CONTEXT.ACTIVATION, code: activationCode },
            conn
        );

        // Issue token pair so the app can stay logged in during OTP verification
        const tokens = await issueTokenPair(driverId, conn);

        await conn.commit();

        const driver = await findDriverById(driverId);

        // Send OTP email – non-fatal; if mailer not configured it logs a warning
        if (email) {
            try {
                await sendDriverActivationEmail({
                    toEmail: email,
                    firstname: driver.firstname,
                    code: activationCode,
                });
            } catch (mailErr) {
                console.error("[driver-auth] Failed to send activation email:", mailErr.message);
            }
        }

        return {
            driver: toDriverProfile(driver),
            activation_required: true,
            ...tokens,
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

/**
 * Verify OTP code for account activation.
 *
 * Unauthenticated endpoint – driver passes { driver_id, code }.
 * On success: sets is_activated=1, returns updated profile + fresh token pair.
 */
export async function verifyDriverOtp(payload) {
    const driverId = Number(payload.driver_id);
    const code = String(payload.code || "").trim();

    if (!driverId || !code) {
        throw new AppError("driver_id and code are required.", 422, "INVALID_PAYLOAD");
    }

    const driver = await findDriverById(driverId);

    if (!driver || driver.account_deleted === 1) {
        throw new AppError("Driver not found.", 404, "DRIVER_NOT_FOUND");
    }

    if (driver.is_activated === 1) {
        throw new AppError("Account is already activated.", 409, "ALREADY_ACTIVATED");
    }

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        const consumed = await consumeDriverAccountCode(
            { driverId, context: CODE_CONTEXT.ACTIVATION, code },
            conn
        );

        if (!consumed) {
            throw new AppError("Invalid or expired OTP.", 400, "INVALID_OTP");
        }

        await setDriverActivated(driverId, conn);

        // Invalidate all previous sessions and issue fresh tokens
        await deleteAllDriverSessions(driverId, conn);
        const tokens = await issueTokenPair(driverId, conn);

        await conn.commit();

        const updated = await findDriverById(driverId);

        return {
            driver: toDriverProfile(updated),
            verified: true,
            ...tokens,
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

/**
 * Resend OTP to a driver who has not yet activated their account.
 *
 * Unauthenticated – driver passes { identifier } (email or phone).
 * Rate-limited at route level. Replaces any existing ACTIVATION code.
 */
export async function resendDriverOtp(payload) {
    const identifier = normalizeIdentifier(payload.identifier);

    if (!identifier) {
        // Return generic message to avoid user enumeration
        return { message: "If the account exists, a new OTP has been sent." };
    }

    const driverAuth = await findDriverByIdentifier(identifier);

    // Always return the same message to prevent enumeration
    if (!driverAuth) {
        return { message: "If the account exists, a new OTP has been sent." };
    }

    if (driverAuth.isActivated === 1) {
        // Already activated – silently succeed (do not leak activation status)
        return { message: "If the account exists, a new OTP has been sent." };
    }

    if (driverAuth.accountDeleted === 1) {
        return { message: "If the account exists, a new OTP has been sent." };
    }

    // Generate fresh OTP and replace the old one atomically
    const newCode = String(Math.floor(100000 + Math.random() * 900000));

    await replaceDriverAccountCode({
        driverId: driverAuth.id,
        context: CODE_CONTEXT.ACTIVATION,
        code: newCode,
    });

    if (driverAuth.email) {
        try {
            await sendDriverActivationEmail({
                toEmail: driverAuth.email,
                firstname: driverAuth.firstname,
                code: newCode,
            });
        } catch (mailErr) {
            console.error("[driver-auth] Failed to resend activation email:", mailErr.message);
        }
    }

    return { message: "If the account exists, a new OTP has been sent." };
}
