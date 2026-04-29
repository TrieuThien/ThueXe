import sqldb from "../../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

export async function findDefaultCurrency(conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, iso_code, symbol
         FROM currencies
         ORDER BY \`default\` DESC, id ASC
         LIMIT 1`
    );

    return rows[0] || { id: 1, iso_code: "VND", symbol: "?" };
}

export async function findCustomerWallet(userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT wa.wallet_id, wa.actor_type, wa.actor_id, wa.currency_id, wa.balance, wa.status,
                c.iso_code AS currency_code, c.symbol AS currency_symbol
         FROM wallet_accounts wa
         LEFT JOIN currencies c ON c.id = wa.currency_id
         WHERE wa.actor_type = 0 AND wa.actor_id = ?
         LIMIT 1`,
        [userId]
    );

    return rows[0] || null;
}

export async function createCustomerWallet({ userId, currencyId }, conn = null) {
    const [result] = await db(conn).query(
        `INSERT INTO wallet_accounts (actor_type, actor_id, currency_id, balance, status)
         VALUES (0, ?, ?, 0, 1)`,
        [userId, currencyId]
    );

    return Number(result.insertId);
}

export async function findCustomerWalletForUpdate(userId, conn) {
    const [rows] = await db(conn).query(
        `SELECT wallet_id, actor_type, actor_id, currency_id, balance, status
         FROM wallet_accounts
         WHERE actor_type = 0 AND actor_id = ?
         LIMIT 1
         FOR UPDATE`,
        [userId]
    );

    return rows[0] || null;
}

export async function updateWalletBalance(walletId, balance, conn) {
    await db(conn).query(
        `UPDATE wallet_accounts
         SET balance = ?
         WHERE wallet_id = ?
         LIMIT 1`,
        [balance, walletId]
    );
}

export async function listWalletTransactionsByWallet(
    walletId,
    { entryType = null, limit = 20, offset = 0 },
    conn = null
) {
    const params = [walletId];
    let whereSql = "";

    if (entryType) {
        whereSql = " AND wl.entry_type = ?";
        params.push(entryType);
    }

    const [rows] = await db(conn).query(
        `SELECT wl.ledger_id, wl.wallet_id, wl.payment_id, wl.amount, wl.balance_after, wl.direction,
                wl.entry_type, wl.source_type, wl.source_id, wl.description, wl.created_at,
                p.payment_code, p.status AS payment_status, p.service_domain
         FROM wallet_ledger wl
         LEFT JOIN payments p ON p.payment_id = wl.payment_id
         WHERE wl.wallet_id = ?${whereSql}
         ORDER BY wl.ledger_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    return rows.map((row) => ({
        ledger_id: Number(row.ledger_id),
        wallet_id: Number(row.wallet_id),
        payment_id: row.payment_id === null ? null : Number(row.payment_id),
        amount: Number(row.amount || 0),
        balance_after: row.balance_after === null ? null : Number(row.balance_after),
        direction: row.direction,
        entry_type: row.entry_type,
        source_type: row.source_type,
        source_id: row.source_id === null ? null : Number(row.source_id),
        description: row.description,
        created_at: row.created_at,
        payment: row.payment_code
            ? {
                  payment_code: row.payment_code,
                  status: row.payment_status,
                  service_domain: Number(row.service_domain || 0),
              }
            : null,
    }));
}

export async function countWalletTransactionsByWallet(walletId, { entryType = null } = {}, conn = null) {
    const params = [walletId];
    let whereSql = "";

    if (entryType) {
        whereSql = " AND entry_type = ?";
        params.push(entryType);
    }

    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total_items
         FROM wallet_ledger
         WHERE wallet_id = ?${whereSql}`,
        params
    );

    return Number(rows[0]?.total_items || 0);
}

export async function insertPayment(payload, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO payments
         (payment_code, payer_wallet_id, actor_type, actor_id, service_domain, booking_id, rental_id,
          gateway_name, gateway_transaction_ref, amount, currency_id, status, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.payment_code,
            payload.payer_wallet_id || null,
            payload.actor_type,
            payload.actor_id,
            payload.service_domain,
            payload.booking_id || null,
            payload.rental_id || null,
            payload.gateway_name || null,
            payload.gateway_transaction_ref || null,
            payload.amount,
            payload.currency_id,
            payload.status,
            payload.description || null,
        ]
    );

    return Number(result.insertId);
}

export async function findPaymentByIdForUser(paymentId, userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT payment_id, payment_code, payer_wallet_id, actor_type, actor_id, service_domain,
                booking_id, rental_id, gateway_name, gateway_transaction_ref, amount, currency_id,
                status, description, created_at, updated_at
         FROM payments
         WHERE payment_id = ? AND actor_type = 0 AND actor_id = ?
         LIMIT 1`,
        [paymentId, userId]
    );

    return rows[0] || null;
}

export async function findPaymentByIdForUpdate(paymentId, conn) {
    const [rows] = await db(conn).query(
        `SELECT payment_id, payment_code, payer_wallet_id, actor_type, actor_id, service_domain,
                booking_id, rental_id, gateway_name, gateway_transaction_ref, amount, currency_id,
                status, description, created_at, updated_at
         FROM payments
         WHERE payment_id = ?
         LIMIT 1
         FOR UPDATE`,
        [paymentId]
    );

    return rows[0] || null;
}

export async function findPaymentByCode(paymentCode, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT payment_id, payment_code, payer_wallet_id, actor_type, actor_id, service_domain,
                booking_id, rental_id, gateway_name, gateway_transaction_ref, amount, currency_id,
                status, description, created_at, updated_at
         FROM payments
         WHERE payment_code = ?
         LIMIT 1`,
        [paymentCode]
    );

    return rows[0] || null;
}

export async function updatePaymentStatus(paymentId, status, conn) {
    await db(conn).query(
        `UPDATE payments
         SET status = ?
         WHERE payment_id = ?
         LIMIT 1`,
        [status, paymentId]
    );
}

export async function updatePaymentGatewayRef(paymentId, gatewayRef, conn) {
    await db(conn).query(
        `UPDATE payments
         SET gateway_transaction_ref = ?
         WHERE payment_id = ?
         LIMIT 1`,
        [gatewayRef, paymentId]
    );
}

export async function insertWalletLedger(payload, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO wallet_ledger
         (wallet_id, payment_id, amount, balance_after, direction, entry_type, source_type, source_id, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.wallet_id,
            payload.payment_id || null,
            payload.amount,
            payload.balance_after,
            payload.direction,
            payload.entry_type,
            payload.source_type,
            payload.source_id || null,
            payload.description || null,
        ]
    );

    return Number(result.insertId);
}

export async function findBookingForCustomerPayment(bookingId, userId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT id, user_id, ride_id, estimated_cost, actual_cost, haspaid, payment_type, transaction_id
         FROM bookings
         WHERE id = ? AND user_id = ?
         LIMIT 1${lockSql}`,
        [bookingId, userId]
    );

    return rows[0] || null;
}

export async function markBookingPaid({ bookingId, paymentId, paymentType, amount }, conn) {
    await db(conn).query(
        `UPDATE bookings
         SET haspaid = 1,
             payment_type = ?,
             paid_amount = ?,
             transaction_id = ?
         WHERE id = ?
         LIMIT 1`,
        [paymentType, amount, paymentId, bookingId]
    );
}

export async function findRentalForCustomerPayment(rentalId, userId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT rental_id, user_id, package_id, total_price, payment_status, payment_type, transaction_id
         FROM rental_bookings
         WHERE rental_id = ? AND user_id = ?
         LIMIT 1${lockSql}`,
        [rentalId, userId]
    );

    return rows[0] || null;
}

export async function findRentalForDepositPayment(rentalId, userId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT rental_id, user_id, owner_id, deposit_amount, total_price, payment_status
         FROM rental_bookings
         WHERE rental_id = ? AND user_id = ?
         LIMIT 1${lockSql}`,
        [rentalId, userId]
    );

    const row = rows[0];
    if (!row) return null;
    return {
        rental_id: Number(row.rental_id),
        user_id: Number(row.user_id),
        owner_id: row.owner_id !== null ? Number(row.owner_id) : null,
        deposit_amount: Number(row.deposit_amount || 0),
        total_price: Number(row.total_price || 0),
        payment_status: row.payment_status,
    };
}

export async function markRentalDepositPaid({ rentalId }, conn) {
    await db(conn).query(
        `UPDATE rental_bookings
         SET payment_status = 'deposit_paid'
         WHERE rental_id = ?
         LIMIT 1`,
        [rentalId]
    );
}

export async function findWalletByActorForUpdate(actorType, actorId, conn) {
    const [rows] = await db(conn).query(
        `SELECT wallet_id, actor_type, actor_id, currency_id, balance, status
         FROM wallet_accounts
         WHERE actor_type = ? AND actor_id = ?
         LIMIT 1
         FOR UPDATE`,
        [actorType, actorId]
    );

    const row = rows[0];
    if (!row) return null;
    return {
        wallet_id: Number(row.wallet_id),
        actor_type: Number(row.actor_type),
        actor_id: Number(row.actor_id),
        currency_id: Number(row.currency_id),
        balance: Number(row.balance || 0),
        status: Number(row.status || 0),
    };
}

export async function createWalletForActor({ actorType, actorId, currencyId }, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO wallet_accounts (actor_type, actor_id, currency_id, balance, status)
         VALUES (?, ?, ?, 0, 1)`,
        [actorType, actorId, currencyId]
    );
    return Number(result.insertId);
}

export async function markRentalPaid({ rentalId, paymentId, paymentType }, conn) {
    await db(conn).query(
        `UPDATE rental_bookings
         SET payment_status = 'paid',
             payment_type = ?,
             transaction_id = ?
         WHERE rental_id = ?
         LIMIT 1`,
        [paymentType, paymentId, rentalId]
    );
}

export async function findUserBankAccount(bankAccountId, userId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT bank_account_id, user_id, bank_name, bank_account_number, bank_account_holder, bank_code,
                is_default, verified_status
         FROM user_bank_accounts
         WHERE bank_account_id = ? AND user_id = ?
         LIMIT 1`,
        [bankAccountId, userId]
    );

    return rows[0] || null;
}

export async function insertWithdrawalRequest({ walletId, amount, note }, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO withdrawal_requests (wallet_id, amount, status, note)
         VALUES (?, ?, 'pending', ?)`,
        [walletId, amount, note || null]
    );

    return Number(result.insertId);
}

export async function listWithdrawalsByWallet(walletId, { limit = 20, offset = 0 } = {}, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT withdrawal_id, wallet_id, amount, status, note, requested_at, processed_at
         FROM withdrawal_requests
         WHERE wallet_id = ?
         ORDER BY withdrawal_id DESC
         LIMIT ? OFFSET ?`,
        [walletId, limit, offset]
    );

    return rows.map((row) => ({
        withdrawal_id: Number(row.withdrawal_id),
        wallet_id: Number(row.wallet_id),
        amount: Number(row.amount || 0),
        status: row.status,
        note: row.note,
        requested_at: row.requested_at,
        processed_at: row.processed_at,
    }));
}

export async function countWithdrawalsByWallet(walletId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total_items
         FROM withdrawal_requests
         WHERE wallet_id = ?`,
        [walletId]
    );

    return Number(rows[0]?.total_items || 0);
}

export async function insertGatewayLog(payload, conn = null) {
    const [result] = await db(conn).query(
        `INSERT INTO pgateway
         (p_transaction_ref, transaction_ref, access_code, status, gateway_resp, amount, date, gateway, cur,
          user_type, service_type, user_id, rental_id, memo)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.p_transaction_ref || null,
            payload.transaction_ref,
            payload.access_code || null,
            payload.status || null,
            payload.gateway_resp || null,
            payload.amount || null,
            payload.gateway || "mock",
            payload.cur || null,
            payload.user_type,
            payload.service_type,
            payload.user_id,
            payload.rental_id || null,
            payload.memo || null,
        ]
    );

    return Number(result.insertId);
}
