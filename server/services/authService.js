import sqldb from "../config/sqldatabase.js";
import AppError from "../utils/appError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
    generateCodeToken,
    signAccessToken,
    signRefreshToken,
    signResetToken,
    verifyRefreshToken,
    verifyResetToken,
} from "../utils/token.js";
import {
    CODE_CONTEXT,
    USER_TYPE,
    findAccountByTypeAndId,
    findDriverByEmail,
    findDriverByIdentifier,
    findDriverByPhone,
    findSessionToken,
    findUserByEmail,
    findUserByIdentifier,
    findUserByPhone,
    createPassengerAccount,
    createStaffAccount,
    createSessionToken,
    deleteAllUserSessions,
    deleteSessionToken,
    replaceAccountCode,
    consumeAccountCode,
    updateDriverLastLogin,
    updateDriverPassword,
    updateUserLastLogin,
    updateUserPassword,
} from "../repositories/authRepository.js";
import { ROLES } from "../utils/authRole.js";
import { sendPasswordResetEmail } from "./emailService.js";

const STAFF_ROLE_TO_ACCOUNT_TYPE = {
    [ROLES.DISPATCHER]: 2,
    [ROLES.ADMIN]: 3,
};

function normalizeEmail(email) {
    if (!email) return null;
    return String(email).trim().toLowerCase();
}

function normalizePhone(phone) {
    if (!phone) return null;
    return String(phone).trim();
}

function normalizeIdentifier(identifier) {
    if (!identifier) return "";
    const value = String(identifier).trim();
    return isEmailIdentifier(value) ? value.toLowerCase() : value;
}

function isEmailIdentifier(identifier) {
    return identifier.includes("@");
}

function sanitizeAuthUser(account) {
    return {
        id: account.id,
        role: account.role,
        userType: account.userType,
        accountType: account.accountType,
        firstname: account.firstname,
        lastname: account.lastname,
        email: account.email,
        phone: account.phone,
    };
}

function assertAccountCanAuthenticate(account) {
    if (!account || account.accountDeleted === 1) {
        throw new AppError(
            "Unable to authenticate with provided credentials.",
            401,
            "INVALID_CREDENTIALS"
        );
    }

    if (account.isActivated !== 1) {
        throw new AppError("Account is not activated.", 403, "ACCOUNT_NOT_ACTIVATED");
    }

    if (account.accountActive !== 1) {
        throw new AppError("Account is inactive.", 403, "ACCOUNT_INACTIVE");
    }
}

async function issueTokenPair(account, conn) {
    const refreshTokenId = generateCodeToken(10);

    const accessToken = signAccessToken({
        sub: account.id,
        role: account.role,
        userType: account.userType,
        accountType: account.accountType,
    });

    const refreshToken = signRefreshToken({
        sub: account.id,
        role: account.role,
        userType: account.userType,
        accountType: account.accountType,
        tid: refreshTokenId,
    });

    await createSessionToken(
        {
            token: refreshTokenId,
            userId: account.id,
            userType: account.userType,
        },
        conn
    );

    return {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
    };
}

export async function registerPassenger(payload) {
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);

    if (!email && !phone) {
        throw new AppError("Either email or phone is required.", 422, "INVALID_IDENTIFIER");
    }

    const [existingUserByEmail, existingDriverByEmail, existingUserByPhone, existingDriverByPhone] =
        await Promise.all([
            findUserByEmail(email),
            findDriverByEmail(email),
            findUserByPhone(phone),
            findDriverByPhone(phone),
        ]);

    if (
        existingUserByEmail ||
        existingDriverByEmail ||
        existingUserByPhone ||
        existingDriverByPhone
    ) {
        throw new AppError("Identifier is already in use.", 409, "IDENTIFIER_ALREADY_USED");
    }

    const passwordHash = await hashPassword(payload.password);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        const userId = await createPassengerAccount(
            {
                firstname: payload.firstname,
                lastname: payload.lastname,
                email,
                phone,
                passwordHash,
                country: payload.country,
                routeId: payload.route_id,
                dispLang: payload.disp_lang,
                countryCode: payload.country_code,
                countryDialCode: payload.country_dial_code,
            },
            connection
        );

        const account = await findAccountByTypeAndId({ userType: USER_TYPE.USER, userId });

        const tokens = await issueTokenPair(account, connection);

        await connection.commit();

        return {
            user: sanitizeAuthUser(account),
            ...tokens,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function createStaffByAdmin(payload) {
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    const role = String(payload.role || "").trim().toLowerCase();

    if (!email && !phone) {
        throw new AppError("Either email or phone is required.", 422, "INVALID_IDENTIFIER");
    }

    const accountType = STAFF_ROLE_TO_ACCOUNT_TYPE[role];

    if (!accountType) {
        throw new AppError(
            "Role must be one of admin or dispatcher.",
            422,
            "INVALID_ROLE"
        );
    }

    const [existingUserByEmail, existingDriverByEmail, existingUserByPhone, existingDriverByPhone] =
        await Promise.all([
            findUserByEmail(email),
            findDriverByEmail(email),
            findUserByPhone(phone),
            findDriverByPhone(phone),
        ]);

    if (
        existingUserByEmail ||
        existingDriverByEmail ||
        existingUserByPhone ||
        existingDriverByPhone
    ) {
        throw new AppError("Identifier is already in use.", 409, "IDENTIFIER_ALREADY_USED");
    }

    const passwordHash = await hashPassword(payload.password);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        const userId = await createStaffAccount(
            {
                firstname: payload.firstname,
                lastname: payload.lastname,
                email,
                phone,
                passwordHash,
                accountType,
                country: payload.country,
                routeId: payload.route_id,
                dispLang: payload.disp_lang,
                countryCode: payload.country_code,
                countryDialCode: payload.country_dial_code,
            },
            connection
        );

        const account = await findAccountByTypeAndId({
            userType: USER_TYPE.USER,
            userId,
        });

        await connection.commit();

        return {
            user: sanitizeAuthUser(account),
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function login(payload) {
    const identifier = normalizeIdentifier(payload.identifier);

    const [userAccount, driverAccount] = await Promise.all([
        findUserByIdentifier(identifier),
        findDriverByIdentifier(identifier),
    ]);

    const candidates = [userAccount, driverAccount].filter(Boolean);
    let matchedAccount = null;
    for (const candidate of candidates) {
        const passwordOk = await verifyPassword(payload.password, candidate.passwordHash);
        if (passwordOk) {
            matchedAccount = candidate;
            break;
        }
    }

    if (!matchedAccount) {
        throw new AppError(
            "Unable to authenticate with provided credentials.",
            401,
            "INVALID_CREDENTIALS"
        );
    }
    assertAccountCanAuthenticate(matchedAccount);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        if (matchedAccount.userType === USER_TYPE.DRIVER) {
            await updateDriverLastLogin(matchedAccount.id, connection);
        } else {
            await updateUserLastLogin(matchedAccount.id, connection);
        }

        const tokens = await issueTokenPair(matchedAccount, connection);

        await connection.commit();

        return {
            user: sanitizeAuthUser(matchedAccount),
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
    const email = normalizeEmail(payload.email);

    const [userAccount, driverAccount] = await Promise.all([
        findUserByEmail(email),
        findDriverByEmail(email),
    ]);

    const targets = [userAccount, driverAccount].filter(Boolean);

    if (targets.length === 0) {
        return {
            message:
                "If the email exists in our system, password reset instructions will be sent shortly.",
        };
    }

    await Promise.all(
        targets.map(async (account) => {
            const resetCode = generateCodeToken(10);
            const resetToken = signResetToken({
                sub: account.id,
                userType: account.userType,
                tid: resetCode,
                purpose: "password-reset",
            });

            await replaceAccountCode({
                userId: account.id,
                userType: account.userType,
                context: CODE_CONTEXT.RESET_PASSWORD,
                code: resetCode,
            });

            const resetLink = `${process.env.PASSWORD_RESET_URL || "http://localhost:5174/reset-password"}?token=${encodeURIComponent(resetToken)}`;

            await sendPasswordResetEmail({
                toEmail: account.email,
                resetLink,
            });
        })
    );

    return {
        message:
            "If the email exists in our system, password reset instructions will be sent shortly.",
    };
}

export async function resetPassword(payload) {
    let decoded;

    try {
        decoded = verifyResetToken(payload.token);
    } catch (error) {
        throw new AppError("Invalid or expired reset token.", 400, "INVALID_RESET_TOKEN");
    }

    if (decoded.purpose !== "password-reset") {
        throw new AppError("Invalid or expired reset token.", 400, "INVALID_RESET_TOKEN");
    }

    const userId = Number(decoded.sub);
    const userType = Number(decoded.userType);
    const resetCode = String(decoded.tid || "");

    if (!userId || ![USER_TYPE.USER, USER_TYPE.DRIVER].includes(userType) || !resetCode) {
        throw new AppError("Invalid or expired reset token.", 400, "INVALID_RESET_TOKEN");
    }

    const passwordHash = await hashPassword(payload.newPassword);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        const consumed = await consumeAccountCode(
            {
                userId,
                userType,
                context: CODE_CONTEXT.RESET_PASSWORD,
                code: resetCode,
            },
            connection
        );

        if (!consumed) {
            throw new AppError("Invalid or expired reset token.", 400, "INVALID_RESET_TOKEN");
        }

        if (userType === USER_TYPE.DRIVER) {
            await updateDriverPassword(userId, passwordHash, connection);
        } else {
            await updateUserPassword(userId, passwordHash, connection);
        }

        await deleteAllUserSessions({ userId, userType }, connection);

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

    if (!tokenId || !userId || ![USER_TYPE.USER, USER_TYPE.DRIVER].includes(userType)) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    const session = await findSessionToken({
        token: tokenId,
        userId,
        userType,
    });

    if (!session) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    const account = await findAccountByTypeAndId({ userType, userId });
    assertAccountCanAuthenticate(account);

    const connection = await sqldb.getConnection();
    try {
        await connection.beginTransaction();

        await deleteSessionToken({ token: tokenId, userId, userType }, connection);

        const tokens = await issueTokenPair(account, connection);

        await connection.commit();

        return {
            user: sanitizeAuthUser(account),
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
        const userType = Number(decoded.userType);

        if (tokenId && userId && [USER_TYPE.USER, USER_TYPE.DRIVER].includes(userType)) {
            await deleteSessionToken({ token: tokenId, userId, userType });
        }
    } catch (error) {
        // Always return success to avoid leaking token validity.
    }

    return {
        message: "Logged out successfully.",
    };
}

export async function getCurrentProfile(auth) {
    const account = await findAccountByTypeAndId({
        userType: auth.userType,
        userId: auth.userId,
    });

    assertAccountCanAuthenticate(account);

    return {
        user: sanitizeAuthUser(account),
    };
}
