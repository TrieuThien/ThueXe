import sqldb from "../config/sqldatabase.js";
import {
    countRewardHistory,
    countRewardHistoryByUserId,
    findBookingForRewardByIdForUpdate,
    findEarnHistoryByBookingId,
    findEligibleBookingIdsMissingEarnHistoryByUserId,
    findRewardConfig,
    findRewardHistory,
    findRewardHistoryByUserId,
    findRewardWalletByUserId,
    findRewardWalletByUserIdForUpdate,
    insertRewardHistory,
    updateUserRewardBalance,
    upsertRewardConfig,
} from "../repositories/rewardPointsRepository.js";
import AppError from "../utils/appError.js";

const ACTION_TYPE = {
    EARN: 1,
    REDEEM: 2,
    ADJUST_ADD: 4,
    ADJUST_SUBTRACT: 5,
};

function assertAdmin(auth) {
    if (!auth || Number(auth.accountType) !== 3 || auth.role !== "admin") {
        throw new AppError("Bạn không có quyền thực hiện thao tác này.", 403, "FORBIDDEN");
    }
}

function normalizeNumber(value, { fallback = null, min = null, allowZero = true } = {}) {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new AppError("Giá trị số không hợp lệ.", 422, "INVALID_NUMBER");
    }

    if (min !== null && parsed < min) {
        throw new AppError("Giá trị số không hợp lệ.", 422, "INVALID_NUMBER");
    }

    if (!allowZero && parsed === 0) {
        throw new AppError("Giá trị số không hợp lệ.", 422, "INVALID_NUMBER");
    }

    return parsed;
}

function normalizeInt(value, { fallback = null, min = null } = {}) {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);

    if (!Number.isInteger(parsed)) {
        throw new AppError("Giá trị số nguyên không hợp lệ.", 422, "INVALID_INTEGER");
    }

    if (min !== null && parsed < min) {
        throw new AppError("Giá trị số nguyên không hợp lệ.", 422, "INVALID_INTEGER");
    }

    return parsed;
}

function normalizeText(value, { maxLength = 255, fallback = null } = {}) {
    if (value === undefined || value === null) return fallback;
    const text = String(value).trim();
    if (!text) return fallback;
    return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function toDateTimeFromISO(value, endOfDay = false) {
    const text = normalizeText(value);
    if (!text) return null;

    if (text.includes("T")) {
        const normalized = text.replace("T", " ").slice(0, 19);
        const date = new Date(normalized.replace(" ", "T"));
        if (Number.isNaN(date.getTime())) {
            throw new AppError("Thời gian không hợp lệ.", 422, "INVALID_DATE");
        }
        return normalized;
    }

    const date = new Date(`${text}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        throw new AppError("Thời gian không hợp lệ.", 422, "INVALID_DATE");
    }

    return `${text} ${endOfDay ? "23:59:59" : "00:00:00"}`;
}

function roundPoint(value) {
    return Number(Number(value).toFixed(1));
}

function roundMoney(value) {
    return Number(Number(value).toFixed(2));
}

function composeWalletSummary(wallet) {
    const totalPoints = roundPoint(wallet.reward_points || 0);
    const redeemedPoints = roundPoint(wallet.reward_points_redeemed || 0);
    const availablePoints = roundPoint(Math.max(0, totalPoints - redeemedPoints));

    return {
        total_points: totalPoints,
        redeemed_points: redeemedPoints,
        available_points: availablePoints,
    };
}

function ensureCustomerAccount(wallet) {
    if (!wallet) {
        throw new AppError("Không tìm thấy người dùng.", 404, "USER_NOT_FOUND");
    }

    if (Number(wallet.account_type) !== 1) {
        throw new AppError("Chỉ hỗ trợ tích điểm cho khách hàng.", 422, "INVALID_USER_TYPE");
    }
}

function mapActionTypeLabel(actionType) {
    switch (Number(actionType)) {
        case ACTION_TYPE.EARN:
            return "Cộng điểm";
        case ACTION_TYPE.REDEEM:
            return "Đổi điểm";
        case ACTION_TYPE.ADJUST_ADD:
            return "Điều chỉnh tăng";
        case ACTION_TYPE.ADJUST_SUBTRACT:
            return "Điều chỉnh giảm";
        default:
            return "Khác";
    }
}

function normalizeConfigPayload(payload = {}) {
    const curToPointsConv = normalizeNumber(payload.cur_to_points_conv, {
        fallback: null,
        min: 0.0001,
        allowZero: false,
    });
    const pointsToCurConv = normalizeNumber(payload.points_to_cur_conv, {
        fallback: null,
        min: 0.0001,
        allowZero: false,
    });
    const status = normalizeInt(payload.status, { fallback: null, min: 0 });
    const minPointsRedeemable = normalizeInt(payload.min_points_redeemable, {
        fallback: null,
        min: 1,
    });

    if (![0, 1].includes(status)) {
        throw new AppError("Trạng thái tích điểm phải là 0 hoặc 1.", 422, "INVALID_STATUS");
    }

    return {
        cur_to_points_conv: roundMoney(curToPointsConv),
        points_to_cur_conv: roundMoney(pointsToCurConv),
        status,
        min_points_redeemable: minPointsRedeemable,
    };
}

function normalizeHistoryFilters(query = {}) {
    const page = Math.max(normalizeInt(query.page, { fallback: 1, min: 1 }) || 1, 1);
    const limit = Math.min(Math.max(normalizeInt(query.limit, { fallback: 20, min: 1 }) || 20, 1), 100);
    const userId = normalizeInt(query.userId, { fallback: null, min: 1 });
    const actionType = normalizeInt(query.actionType, { fallback: null, min: 1 });
    const dateFrom = toDateTimeFromISO(query.dateFrom, false);
    const dateTo = toDateTimeFromISO(query.dateTo, true);

    if (actionType !== null && ![1, 2, 4, 5].includes(actionType)) {
        throw new AppError("Loại hành động không hợp lệ.", 422, "INVALID_ACTION_TYPE");
    }

    if (dateFrom && dateTo) {
        const from = new Date(dateFrom.replace(" ", "T"));
        const to = new Date(dateTo.replace(" ", "T"));
        if (from.getTime() > to.getTime()) {
            throw new AppError("Khoảng thời gian lọc không hợp lệ.", 422, "INVALID_DATE_RANGE");
        }
    }

    return {
        page,
        limit,
        userId,
        actionType,
        dateFrom,
        dateTo,
        search: normalizeText(query.search, { maxLength: 100, fallback: "" }) || "",
    };
}

function toConfigResponse(config) {
    if (!config) {
        return {
            id: null,
            cur_to_points_conv: 0,
            points_to_cur_conv: 0,
            status: 0,
            min_points_redeemable: 1,
            date_created: null,
        };
    }

    return {
        id: config.id,
        cur_to_points_conv: roundMoney(config.cur_to_points_conv),
        points_to_cur_conv: roundMoney(config.points_to_cur_conv),
        status: Number(config.status || 0),
        min_points_redeemable: Number(config.min_points_redeemable || 1),
        date_created: config.date_created,
    };
}

function toHistoryResponse(items) {
    return items.map((item) => ({
        ...item,
        action_label: mapActionTypeLabel(item.action_type),
    }));
}

async function lockAndGetConfigOrThrow(connection) {
    const config = await findRewardConfig(connection);
    if (!config) {
        throw new AppError("Chưa cấu hình tích điểm.", 422, "REWARD_CONFIG_NOT_FOUND");
    }

    const curToPoints = Number(config.cur_to_points_conv);
    const pointsToCur = Number(config.points_to_cur_conv);
    const minRedeem = Number(config.min_points_redeemable || 0);

    if (!Number.isFinite(curToPoints) || curToPoints <= 0) {
        throw new AppError("Cấu hình quy đổi tiền sang điểm không hợp lệ.", 422, "INVALID_CUR_TO_POINTS");
    }

    if (!Number.isFinite(pointsToCur) || pointsToCur <= 0) {
        throw new AppError("Cấu hình quy đổi điểm sang tiền không hợp lệ.", 422, "INVALID_POINTS_TO_CUR");
    }

    if (!Number.isInteger(minRedeem) || minRedeem < 1) {
        throw new AppError("Cấu hình điểm tối thiểu để đổi không hợp lệ.", 422, "INVALID_MIN_REDEEM");
    }

    return {
        ...config,
        cur_to_points_conv: curToPoints,
        points_to_cur_conv: pointsToCur,
        min_points_redeemable: minRedeem,
    };
}

async function processEarnPointsForBookingInternal(bookingIdInput, actorUserId = null) {
    const bookingId = normalizeInt(bookingIdInput, { fallback: null, min: 1 });
    if (!bookingId) {
        throw new AppError("Mã booking không hợp lệ.", 422, "INVALID_BOOKING_ID");
    }

    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();

        const config = await lockAndGetConfigOrThrow(connection);
        if (Number(config.status) !== 1) {
            await connection.commit();
            return {
                processed: false,
                reason: "REWARD_DISABLED",
                booking_id: bookingId,
                message: "Tích điểm đang tắt nên không cộng điểm.",
            };
        }

        const booking = await findBookingForRewardByIdForUpdate(bookingId, connection);
        if (!booking) {
            throw new AppError("Không tìm thấy booking.", 404, "BOOKING_NOT_FOUND");
        }

        if (!(Number(booking.status) === 3 && Number(booking.haspaid) === 1)) {
            await connection.commit();
            return {
                processed: false,
                reason: "BOOKING_NOT_ELIGIBLE",
                booking_id: bookingId,
                message: "Booking chưa đạt điều kiện cộng điểm (status=3 và haspaid=1).",
            };
        }

        const wallet = await findRewardWalletByUserIdForUpdate(booking.user_id, connection);
        ensureCustomerAccount(wallet);

        const existing = await findEarnHistoryByBookingId(booking.id, wallet.user_id, connection);
        if (existing) {
            await connection.commit();
            return {
                processed: false,
                reason: "ALREADY_PROCESSED",
                booking_id: booking.id,
                user_id: wallet.user_id,
                earned_points: roundPoint(existing.points),
                message: "Booking đã được cộng điểm trước đó.",
            };
        }

        const paidAmount = Number(booking.paid_amount || 0);
        const actualCost = Number(booking.actual_cost || 0);
        const eligibleAmount = paidAmount > 0 ? paidAmount : Math.max(0, actualCost);
        const earnedPoints = Math.floor(eligibleAmount / Number(config.cur_to_points_conv));

        if (earnedPoints <= 0) {
            await connection.commit();
            return {
                processed: false,
                reason: "EARNED_ZERO",
                booking_id: booking.id,
                user_id: wallet.user_id,
                eligible_amount: roundMoney(eligibleAmount),
                message: "Giá trị booking chưa đủ để nhận điểm.",
            };
        }

        const walletSummary = composeWalletSummary(wallet);
        const balanceBefore = walletSummary.available_points;
        const nextTotal = roundPoint(walletSummary.total_points + earnedPoints);
        const nextRedeemed = walletSummary.redeemed_points;
        const balanceAfter = roundPoint(nextTotal - nextRedeemed);

        await updateUserRewardBalance(
            wallet.user_id,
            {
                reward_points: nextTotal,
                reward_points_redeemed: nextRedeemed,
            },
            connection
        );

        await insertRewardHistory(
            {
                user_type: 0,
                user_id: wallet.user_id,
                booking_id: booking.id,
                action_type: ACTION_TYPE.EARN,
                points: roundPoint(earnedPoints),
                money_value: roundMoney(eligibleAmount),
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                ref_table: "bookings",
                ref_id: booking.id,
                note: "Cộng điểm từ booking hoàn tất và đã thanh toán",
                created_by: actorUserId,
            },
            connection
        );

        await connection.commit();

        return {
            processed: true,
            booking_id: booking.id,
            user_id: wallet.user_id,
            eligible_amount: roundMoney(eligibleAmount),
            earned_points: roundPoint(earnedPoints),
            balance_before: balanceBefore,
            balance_after: balanceAfter,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function syncEligibleBookingsForUser(userId) {
    const bookingIds = await findEligibleBookingIdsMissingEarnHistoryByUserId(userId, 50);
    if (!bookingIds.length) {
        return { processedCount: 0, bookingIds: [] };
    }

    let processedCount = 0;

    for (const bookingId of bookingIds) {
        const result = await processEarnPointsForBookingInternal(bookingId);
        if (result?.processed) {
            processedCount += 1;
        }
    }

    return {
        processedCount,
        bookingIds,
    };
}

export async function getRewardConfigByAdmin(auth) {
    assertAdmin(auth);
    const config = await findRewardConfig();
    return { config: toConfigResponse(config) };
}

export async function updateRewardConfigByAdmin(payload, auth) {
    assertAdmin(auth);
    const normalized = normalizeConfigPayload(payload);

    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();
        const configId = await upsertRewardConfig(normalized, connection);
        await connection.commit();

        const config = await findRewardConfig();

        return {
            config: {
                ...toConfigResponse(config),
                id: configId,
            },
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function getRewardHistoryByAdmin(query, auth) {
    assertAdmin(auth);
    const filters = normalizeHistoryFilters(query);

    const [items, totalItems] = await Promise.all([
        findRewardHistory(filters),
        countRewardHistory(filters),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.limit);

    return {
        items: toHistoryResponse(items),
        pagination: {
            page: filters.page,
            limit: filters.limit,
            totalPages,
            hasNextPage: totalPages > 0 && filters.page < totalPages,
            hasPrevPage: filters.page > 1,
        },
        filters,
        totalItems,
    };
}

export async function adjustRewardPointsByAdmin(payload, auth) {
    assertAdmin(auth);

    const userId = normalizeInt(payload.user_id, { fallback: null, min: 1 });
    const points = normalizeNumber(payload.points, {
        fallback: null,
        min: null,
        allowZero: false,
    });
    const note = normalizeText(payload.note, { maxLength: 255, fallback: null });

    if (!userId) {
        throw new AppError("Mã người dùng không hợp lệ.", 422, "INVALID_USER_ID");
    }

    if (!Number.isFinite(points) || points === 0) {
        throw new AppError("Điểm phải khác 0.", 422, "INVALID_POINTS");
    }

    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();

        const config = await lockAndGetConfigOrThrow(connection);
        const wallet = await findRewardWalletByUserIdForUpdate(userId, connection);
        ensureCustomerAccount(wallet);

        const walletSummary = composeWalletSummary(wallet);
        const balanceBefore = walletSummary.available_points;

        let nextTotal = walletSummary.total_points;
        let nextRedeemed = walletSummary.redeemed_points;
        let actionType = ACTION_TYPE.ADJUST_ADD;

        if (points > 0) {
            nextTotal = roundPoint(nextTotal + points);
            actionType = ACTION_TYPE.ADJUST_ADD;
        } else {
            const subtractPoints = roundPoint(Math.abs(points));
            if (balanceBefore < subtractPoints) {
                throw new AppError("Khách hàng không đủ điểm để trừ.", 422, "INSUFFICIENT_POINTS");
            }

            nextRedeemed = roundPoint(nextRedeemed + subtractPoints);
            actionType = ACTION_TYPE.ADJUST_SUBTRACT;
        }

        const balanceAfter = roundPoint(Math.max(0, nextTotal - nextRedeemed));
        const changedPoints = roundPoint(Math.abs(points));

        await updateUserRewardBalance(
            userId,
            {
                reward_points: nextTotal,
                reward_points_redeemed: nextRedeemed,
            },
            connection
        );

        const moneyValue = roundMoney(changedPoints * Number(config.points_to_cur_conv));

        await insertRewardHistory(
            {
                user_type: 0,
                user_id: userId,
                booking_id: null,
                action_type: actionType,
                points: changedPoints,
                money_value: moneyValue,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                ref_table: "admin",
                ref_id: Number(auth.userId),
                note: note || (actionType === ACTION_TYPE.ADJUST_ADD ? "Điều chỉnh tăng điểm thủ công" : "Điều chỉnh giảm điểm thủ công"),
                created_by: Number(auth.userId),
            },
            connection
        );

        await connection.commit();

        const refreshedWallet = await findRewardWalletByUserId(userId);
        const summary = composeWalletSummary(refreshedWallet);

        return {
            user_id: userId,
            action_type: actionType,
            action_label: mapActionTypeLabel(actionType),
            changed_points: changedPoints,
            wallet: summary,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function redeemRewardPointsByAdmin(payload, auth) {
    assertAdmin(auth);

    const userId = normalizeInt(payload.user_id, { fallback: null, min: 1 });
    const redeemPoints = normalizeNumber(payload.redeem_points, {
        fallback: null,
        min: 1,
        allowZero: false,
    });
    const note = normalizeText(payload.note, { maxLength: 255, fallback: null });

    if (!userId) {
        throw new AppError("Mã người dùng không hợp lệ.", 422, "INVALID_USER_ID");
    }

    const pointsValue = roundPoint(redeemPoints);

    const connection = await sqldb.getConnection();

    try {
        await connection.beginTransaction();

        const config = await lockAndGetConfigOrThrow(connection);

        if (pointsValue < Number(config.min_points_redeemable)) {
            throw new AppError(
                `Điểm đổi tối thiểu là ${config.min_points_redeemable}.`,
                422,
                "REDEEM_BELOW_MINIMUM"
            );
        }

        const wallet = await findRewardWalletByUserIdForUpdate(userId, connection);
        ensureCustomerAccount(wallet);

        const walletSummary = composeWalletSummary(wallet);
        const balanceBefore = walletSummary.available_points;

        if (balanceBefore < pointsValue) {
            throw new AppError("Khách hàng không đủ điểm để đổi.", 422, "INSUFFICIENT_POINTS");
        }

        const nextTotal = walletSummary.total_points;
        const nextRedeemed = roundPoint(walletSummary.redeemed_points + pointsValue);
        const balanceAfter = roundPoint(nextTotal - nextRedeemed);
        const moneyValue = roundMoney(pointsValue * Number(config.points_to_cur_conv));

        await updateUserRewardBalance(
            userId,
            {
                reward_points: nextTotal,
                reward_points_redeemed: nextRedeemed,
            },
            connection
        );

        await insertRewardHistory(
            {
                user_type: 0,
                user_id: userId,
                booking_id: null,
                action_type: ACTION_TYPE.REDEEM,
                points: pointsValue,
                money_value: moneyValue,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                ref_table: "admin",
                ref_id: Number(auth.userId),
                note: note || "Đổi điểm thưởng",
                created_by: Number(auth.userId),
            },
            connection
        );

        await connection.commit();

        return {
            user_id: userId,
            redeem_points: pointsValue,
            money_value: moneyValue,
            wallet: {
                total_points: nextTotal,
                redeemed_points: nextRedeemed,
                available_points: balanceAfter,
            },
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function processBookingRewardPointsByAdmin(bookingId, auth) {
    assertAdmin(auth);
    return processEarnPointsForBookingInternal(bookingId, Number(auth.userId));
}

export async function getMyRewardPoints(auth) {
    if (!auth?.userId) {
        throw new AppError("Account is not logged in.", 401, "UNAUTHORIZED");
    }

    const userId = Number(auth.userId);
    await syncEligibleBookingsForUser(userId);

    const [wallet, config] = await Promise.all([
        findRewardWalletByUserId(userId),
        findRewardConfig(),
    ]);

    ensureCustomerAccount(wallet);

    return {
        user: {
            user_id: wallet.user_id,
            firstname: wallet.firstname,
            lastname: wallet.lastname,
            phone: wallet.phone,
            email: wallet.email,
        },
        wallet: composeWalletSummary(wallet),
        config: toConfigResponse(config),
    };
}

export async function getMyRewardHistory(query, auth) {
    if (!auth?.userId) {
        throw new AppError("Account is not logged in.", 401, "UNAUTHORIZED");
    }

    const userId = Number(auth.userId);
    await syncEligibleBookingsForUser(userId);

    const filters = normalizeHistoryFilters(query);

    const [items, totalItems] = await Promise.all([
        findRewardHistoryByUserId(userId, filters),
        countRewardHistoryByUserId(userId, filters),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.limit);

    return {
        items: toHistoryResponse(items),
        pagination: {
            page: filters.page,
            limit: filters.limit,
            totalPages,
            hasNextPage: totalPages > 0 && filters.page < totalPages,
            hasPrevPage: filters.page > 1,
        },
        filters,
        totalItems,
    };
}
