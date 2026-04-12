import sqldb from "../../config/sqldatabase.js";
import { sendCustomerActivationEmail, sendPasswordResetEmail } from "../emailService.js";
import {
    consumeAccountCode,
    createCustomerAccount,
    createSessionToken,
    deleteAllUserSessions,
    deleteSessionToken,
    findAnyAccountByEmail,
    findAnyAccountByPhone,
    findCustomerById,
    findCustomerByIdentifier,
    findSessionToken,
    replaceAccountCode,
    updateCustomerProfile,
    updatePushToken,
    updateUserActivation,
    updateUserLastLogin,
    updateUserPassword,
} from "../../repositories/customer/authRepository.js";
import AppError from "../../utils/appError.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import {
    generateCodeToken,
    signAccessToken,
    signRefreshToken,
    signResetToken,
    verifyRefreshToken,
    verifyResetToken,
} from "../../utils/token.js";
import { CODE_CONTEXT, USER_TYPE } from "../../utils/authRole.js";

function normalizeText(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function normalizeEmail(email) {
    const normalized = normalizeText(email);
    return normalized ? normalized.toLowerCase() : null;
}

function normalizePhone(phone) {
    return normalizeText(phone);
}

function normalizeIdentifier(identifier) {
    const value = normalizeText(identifier);
    if (!value) return "";
    return value.includes("@") ? value.toLowerCase() : value;
}

function generateNumericOtp(length = 6) {
    const size = Math.max(Number(length) || 6, 4);
    const min = 10 ** (size - 1);
    const max = 10 ** size - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function mapContext(context) {
    const normalized = String(context).trim().toUpperCase();
    if (normalized === "ACTIVATION" || normalized === "0") return CODE_CONTEXT.ACTIVATION;
    if (normalized === "RESET_PASSWORD" || normalized === "1") return CODE_CONTEXT.RESET_PASSWORD;
    throw new AppError("Invalid code context.", 422, "INVALID_CODE_CONTEXT");
}

function toAuthUser(account) {
    return {
        id: account.id,
        firstname: account.firstname,
        lastname: account.lastname,
        email: account.email,
        phone: account.phone,
        address: account.address,
        role: account.role || "customer",
        userType: USER_TYPE.USER,
        accountType: account.accountType,
        isActivated: account.isActivated,
        accountActive: account.accountActive,
        pushNotificationToken: account.pushNotificationToken,
        country: account.country,
        routeId: account.routeId,
    };
}

function assertAccountAvailable(account) {
    if (!account || account.accountDeleted === 1) {
        throw new AppError(
            "Unable to authenticate with provided credentials.",
            401,
            "INVALID_CREDENTIALS"
        );
    }

    if (account.accountActive !== 1) {
        throw new AppError("Account is inactive.", 403, "ACCOUNT_INACTIVE");
    }
}

async function issueTokenPair(account, conn) {
    if (!account || !account.id) {
        throw new AppError("Unable to issue token for this account.", 500, "TOKEN_ISSUE_FAILED");
    }

    const refreshTokenId = generateCodeToken(10);

    const accessToken = signAccessToken({
        sub: account.id,
        role: account.role || "customer",
        userType: USER_TYPE.USER,
        accountType: account.accountType,
    });

    const refreshToken = signRefreshToken({
        sub: account.id,
        role: account.role || "customer",
        userType: USER_TYPE.USER,
        accountType: account.accountType,
        tid: refreshTokenId,
    });

    await createSessionToken(
        {
            token: refreshTokenId,
            userId: account.id,
        },
        conn
    );

    return {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
    };
}

export async function registerCustomer(payload) {
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);

    if (!email && !phone) {
        throw new AppError("Either email or phone is required.", 422, "INVALID_IDENTIFIER");
    }

    const [existingEmail, existingPhone] = await Promise.all([
        findAnyAccountByEmail(email),
        findAnyAccountByPhone(phone),
    ]);

    if (existingEmail) {
        throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_USED");
    }

    if (existingPhone) {
        throw new AppError("Phone is already in use.", 409, "PHONE_ALREADY_USED");
    }

    const passwordHash = await hashPassword(payload.password);
    const activationCode = generateNumericOtp(6);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        const userId = await createCustomerAccount(
            {
                firstname: payload.firstname,
                lastname: payload.lastname,
                email,
                phone,
                passwordHash,
                address: normalizeText(payload.address),
                country: normalizeText(payload.country) || "Vietnam",
                routeId: payload.route_id,
                dispLang: payload.disp_lang,
                countryCode: normalizeText(payload.country_code) || "vn",
                countryDialCode: normalizeText(payload.country_dial_code) || "+84",
                isActivated: 0,
            },
            connection
        );

        await replaceAccountCode(
            {
                userId,
                context: CODE_CONTEXT.ACTIVATION,
                code: activationCode,
            },
            connection
        );

        const account = await findCustomerById(userId, connection);
        const tokens = await issueTokenPair(account, connection);

        await connection.commit();

        const response = {
            user: toAuthUser(account),
            activationRequired: true,
            ...tokens,
        };

        if (email) {
            void sendCustomerActivationEmail({
                toEmail: email,
                firstname: account.firstname,
                code: activationCode,
            }).catch((mailErr) => {
                console.error("[customer-auth] Failed to send activation email:", mailErr.message);
            });
        } else if (phone) {
            console.info(
                `[customer-auth] Activation OTP for ${phone}: ${activationCode}`
            );
        }

        return response;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function resendCustomerOtp(payload) {
    const identifier = normalizeIdentifier(payload.identifier);
    const verificationId = Number(payload.verificationId || payload.userId || 0);

    let account = null;
    if (verificationId > 0) {
        account = await findCustomerById(verificationId);
    } else if (identifier) {
        account = await findCustomerByIdentifier(identifier);
    }

    if (!account || account.accountDeleted === 1 || account.isActivated === 1) {
        return {
            message: "If the account exists, a new OTP has been sent.",
        };
    }

    const activationCode = generateNumericOtp(6);

    await replaceAccountCode({
        userId: account.id,
        context: CODE_CONTEXT.ACTIVATION,
        code: activationCode,
    });

    if (account.email) {
        void sendCustomerActivationEmail({
            toEmail: account.email,
            firstname: account.firstname,
            code: activationCode,
        }).catch((mailErr) => {
            console.error("[customer-auth] Failed to resend activation email:", mailErr.message);
        });
    } else if (account.phone) {
        console.info(
            `[customer-auth] Resend activation OTP for ${account.phone}: ${activationCode}`
        );
    }

    return {
        message: "If the account exists, a new OTP has been sent.",
    };
}

export async function verifyOtpCode(payload) {
    const userId = Number(payload.userId);
    const context = mapContext(payload.context);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        const account = await findCustomerById(userId, connection);

        if (!account) {
            throw new AppError("User not found.", 404, "USER_NOT_FOUND");
        }

        const consumed = await consumeAccountCode(
            {
                userId,
                context,
                code: String(payload.code).trim(),
            },
            connection
        );

        if (!consumed) {
            throw new AppError("Invalid or expired OTP.", 400, "INVALID_OTP");
        }

        if (context === CODE_CONTEXT.ACTIVATION && account.isActivated !== 1) {
            await updateUserActivation(userId, 1, connection);
        }

        await connection.commit();

        const updated = await findCustomerById(userId);

        return {
            user: toAuthUser(updated),
            verified: true,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function loginCustomer(payload) {
    const identifier = normalizeIdentifier(payload.identifier);

    const account = await findCustomerByIdentifier(identifier);

    if (!account) {
        throw new AppError(
            "Unable to authenticate with provided credentials.",
            401,
            "INVALID_CREDENTIALS"
        );
    }

    const passwordOk = await verifyPassword(payload.password, account.passwordHash);

    if (!passwordOk) {
        throw new AppError(
            "Unable to authenticate with provided credentials.",
            401,
            "INVALID_CREDENTIALS"
        );
    }

    assertAccountAvailable(account);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        await updateUserLastLogin(account.id, connection);

        const tokens = await issueTokenPair(account, connection);

        await connection.commit();

        return {
            user: toAuthUser(account),
            ...tokens,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function forgotPassword(payload) {
    const identifier = normalizeIdentifier(payload.identifier);

    const account = await findCustomerByIdentifier(identifier);

    if (!account) {
        return {
            message:
                "If the identifier exists in our system, reset instructions have been sent.",
        };
    }

    const resetCode = generateCodeToken(6);
    const resetToken = signResetToken({
        sub: account.id,
        userType: USER_TYPE.USER,
        tid: resetCode,
        purpose: "password-reset",
    });

    await replaceAccountCode({
        userId: account.id,
        context: CODE_CONTEXT.RESET_PASSWORD,
        code: resetCode,
    });

    if (account.email) {
        const resetLink = `${process.env.PASSWORD_RESET_URL || "http://localhost:5174/reset-password"}?token=${encodeURIComponent(resetToken)}`;

        await sendPasswordResetEmail({
            toEmail: account.email,
            resetLink,
        });
    } else if (account.phone) {
        console.info(
            `[customer-auth] RESET_PASSWORD sms not configured for user ${account.id} (${account.phone}). code=${resetCode}`
        );
    }

    return {
        message:
            "If the identifier exists in our system, reset instructions have been sent.",
    };
}

export async function resetPassword(payload) {
    let userId;
    let resetCode;

    if (payload.token) {
        let decoded;
        try {
            decoded = verifyResetToken(payload.token);
        } catch (error) {
            throw new AppError("Invalid or expired reset token.", 400, "INVALID_RESET_TOKEN");
        }

        if (decoded.purpose !== "password-reset" || Number(decoded.userType) !== USER_TYPE.USER) {
            throw new AppError("Invalid or expired reset token.", 400, "INVALID_RESET_TOKEN");
        }

        userId = Number(decoded.sub);
        resetCode = String(decoded.tid || "");
    } else {
        userId = Number(payload.userId);
        resetCode = String(payload.resetCode || "").trim();
    }

    if (!userId || !resetCode) {
        throw new AppError("Invalid reset payload.", 422, "INVALID_RESET_PAYLOAD");
    }

    const passwordHash = await hashPassword(payload.newPassword);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        const consumed = await consumeAccountCode(
            {
                userId,
                context: CODE_CONTEXT.RESET_PASSWORD,
                code: resetCode,
            },
            connection
        );

        if (!consumed) {
            throw new AppError("Invalid or expired reset code.", 400, "INVALID_RESET_CODE");
        }

        await updateUserPassword(userId, passwordHash, connection);
        await deleteAllUserSessions(userId, connection);

        await connection.commit();

        return {
            message: "Password has been reset successfully.",
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function refreshToken(refreshTokenValue) {
    let decoded;

    try {
        decoded = verifyRefreshToken(refreshTokenValue);
    } catch (error) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    const tokenId = String(decoded.tid || "");
    const userId = Number(decoded.sub);
    const userType = Number(decoded.userType);

    if (!tokenId || !userId || userType !== USER_TYPE.USER) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    const [session, account] = await Promise.all([
        findSessionToken({ token: tokenId, userId }),
        findCustomerById(userId),
    ]);

    if (!session || !account) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    assertAccountAvailable(account);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        await deleteSessionToken({ token: tokenId, userId }, connection);

        const tokens = await issueTokenPair(account, connection);

        await connection.commit();

        return {
            user: toAuthUser(account),
            ...tokens,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function logout(refreshTokenValue) {
    const refreshToken = String(refreshTokenValue || "");

    if (!refreshToken) {
        return {
            message: "Logged out successfully.",
        };
    }

    try {
        const decoded = verifyRefreshToken(refreshToken);
        const tokenId = String(decoded.tid || "");
        const userId = Number(decoded.sub);

        if (tokenId && userId) {
            await deleteSessionToken({ token: tokenId, userId });
        }
    } catch {
        // Always return success to avoid leaking token validity.
    }

    return {
        message: "Logged out successfully.",
    };
}

export async function getCurrentProfile(auth) {
    const account = await findCustomerById(auth.userId);

    if (!account || account.accountDeleted === 1) {
        throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    return {
        user: toAuthUser(account),
    };
}

export async function updateCurrentProfile(auth, payload) {
    const userId = Number(auth.userId);
    const email = payload.email !== undefined ? normalizeEmail(payload.email) : undefined;
    const phone = payload.phone !== undefined ? normalizePhone(payload.phone) : undefined;

    const [existingEmail, existingPhone] = await Promise.all([
        email !== undefined ? findAnyAccountByEmail(email, userId) : Promise.resolve(null),
        phone !== undefined ? findAnyAccountByPhone(phone, userId) : Promise.resolve(null),
    ]);

    if (existingEmail) {
        throw new AppError("Email is already in use.", 409, "EMAIL_ALREADY_USED");
    }

    if (existingPhone) {
        throw new AppError("Phone is already in use.", 409, "PHONE_ALREADY_USED");
    }

    await updateCustomerProfile(userId, {
        firstname: payload.firstname,
        lastname: payload.lastname,
        phone,
        email,
        address: payload.address,
    });

    const updated = await findCustomerById(userId);

    if (!updated) {
        throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    return {
        user: toAuthUser(updated),
    };
}

export async function updateCurrentPushToken(auth, payload) {
    const userId = Number(auth.userId);

    const updated = await updatePushToken(userId, payload.pushNotificationToken);

    if (!updated) {
        throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    const account = await findCustomerById(userId);

    return {
        user: toAuthUser(account),
    };
}
