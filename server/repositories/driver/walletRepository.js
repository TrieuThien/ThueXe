import crypto from "crypto";
import sqldb from "../../config/sqldatabase.js";

const DRIVER_ACTOR_TYPE = 1;
// service_domain=2 means wallet_topup (see payments table comment)
const SERVICE_DOMAIN_WALLET_TOPUP = 2;

function db(conn) {
    return conn || sqldb;
}

export function generatePaymentCode(prefix = "PAY") {
    const random = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `${prefix}-${Date.now()}-${random}`;
}

// ─── Wallet account ───────────────────────────────────────────────────────────

export async function findDriverWallet(driverId, conn = null, forUpdate = false) {
    const lockSql = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT wa.wallet_id, wa.actor_type, wa.actor_id, wa.currency_id,
                wa.balance, wa.status,
                c.symbol AS cur_symbol, c.iso_code AS cur_code
         FROM wallet_accounts wa
         LEFT JOIN currencies c ON c.id = wa.currency_id
         WHERE wa.actor_type = ? AND wa.actor_id = ?
         LIMIT 1${lockSql}`,
        [DRIVER_ACTOR_TYPE, driverId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
        wallet_id:   Number(row.wallet_id),
        currency_id: Number(row.currency_id),
        balance:     Number(row.balance || 0),
        status:      Number(row.status  || 0),
        cur_symbol:  row.cur_symbol || "₫",
        cur_code:    row.cur_code   || "VND",
    };
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function listDriverTransactions(
    driverId,
    { limit, offset, entryType, direction, fromDate, toDate } = {},
    conn = null
) {
    const clauses = ["wa.actor_id = ?", "wa.actor_type = ?"];
    const params  = [driverId, DRIVER_ACTOR_TYPE];

    if (entryType)  { clauses.push("wl.entry_type = ?");       params.push(entryType); }
    if (direction)  { clauses.push("wl.direction = ?");         params.push(direction); }
    if (fromDate)   { clauses.push("wl.created_at >= ?");       params.push(`${fromDate} 00:00:00`); }
    if (toDate)     { clauses.push("wl.created_at <= ?");       params.push(`${toDate} 23:59:59`); }

    params.push(limit, offset);

    const [rows] = await db(conn).query(
        `SELECT
            wl.ledger_id AS source_id,
            wl.amount,
            wl.balance_after AS wallet_balance,
            wl.direction,
            wl.entry_type,
            wl.description,
            wl.created_at AS transaction_date
         FROM wallet_accounts wa
         INNER JOIN wallet_ledger wl ON wl.wallet_id = wa.wallet_id
         WHERE ${clauses.join(" AND ")}
         ORDER BY wl.created_at DESC, wl.ledger_id DESC
         LIMIT ? OFFSET ?`,
        params
    );

    return rows.map((row) => ({
        source_id: Number(row.source_id),
        amount: Number(row.amount || 0),
        wallet_balance: Number(row.wallet_balance || 0),
        direction: row.direction,
        entry_type: row.entry_type,
        description: row.description,
        transaction_date: row.transaction_date,
    }));
}

export async function countDriverTransactions(
    driverId,
    { entryType, direction, fromDate, toDate } = {},
    conn = null
) {
    const clauses = ["wa.actor_id = ?", "wa.actor_type = ?"];
    const params  = [driverId, DRIVER_ACTOR_TYPE];

    if (entryType)  { clauses.push("wl.entry_type = ?");   params.push(entryType); }
    if (direction)  { clauses.push("wl.direction = ?");     params.push(direction); }
    if (fromDate)   { clauses.push("wl.created_at >= ?");   params.push(`${fromDate} 00:00:00`); }
    if (toDate)     { clauses.push("wl.created_at <= ?");   params.push(`${toDate} 23:59:59`); }

    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total_items
         FROM wallet_accounts wa
         INNER JOIN wallet_ledger wl ON wl.wallet_id = wa.wallet_id
         WHERE ${clauses.join(" AND ")}`,
        params
    );
    return Number(rows[0]?.total_items || 0);
}

// ─── Ledger aggregate summary ─────────────────────────────────────────────────

/**
 * Returns totals grouped by direction + entry_type for the driver's wallet.
 * Used to compute total_credited / total_debited / breakdown per type.
 */
export async function getWalletLedgerSummary(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT wl.direction, wl.entry_type, SUM(wl.amount) AS total
         FROM wallet_accounts wa
         INNER JOIN wallet_ledger wl ON wl.wallet_id = wa.wallet_id
         WHERE wa.actor_type = ? AND wa.actor_id = ?
         GROUP BY wl.direction, wl.entry_type`,
        [DRIVER_ACTOR_TYPE, driverId]
    );
    return rows.map((r) => ({
        direction:  r.direction,
        entry_type: r.entry_type,
        total:      Number(r.total || 0),
    }));
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────

export async function listDriverWithdrawals(driverId, { limit, offset }, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT
            wr.withdrawal_id AS id,
            wr.amount,
            wr.status,
            wr.note,
            wr.requested_at,
            wr.processed_at
         FROM wallet_accounts wa
         INNER JOIN withdrawal_requests wr ON wr.wallet_id = wa.wallet_id
         WHERE wa.actor_id = ? AND wa.actor_type = ?
         ORDER BY wr.requested_at DESC, wr.withdrawal_id DESC
         LIMIT ? OFFSET ?`,
        [driverId, DRIVER_ACTOR_TYPE, limit, offset]
    );

    return rows.map((row) => ({
        id: Number(row.id),
        amount: Number(row.amount || 0),
        status: row.status,
        note: row.note,
        requested_at: row.requested_at,
        processed_at: row.processed_at,
    }));
}

export async function countDriverWithdrawals(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS total_items
         FROM wallet_accounts wa
         INNER JOIN withdrawal_requests wr ON wr.wallet_id = wa.wallet_id
         WHERE wa.actor_id = ? AND wa.actor_type = ?`,
        [driverId, DRIVER_ACTOR_TYPE]
    );
    return Number(rows[0]?.total_items || 0);
}

/**
 * Insert a new withdrawal request.
 * NOTE: Does NOT debit the wallet – admin approves and debits separately.
 */
export async function insertWithdrawalRequest({ walletId, amount, note }, conn) {
    const [result] = await db(conn).query(
        `INSERT INTO withdrawal_requests (wallet_id, amount, status, note)
         VALUES (?, ?, 'pending', ?)`,
        [walletId, amount, note || null]
    );
    return Number(result.insertId);
}

export async function countPendingWithdrawals(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT COUNT(*) AS cnt
         FROM wallet_accounts wa
         INNER JOIN withdrawal_requests wr ON wr.wallet_id = wa.wallet_id
         WHERE wa.actor_id = ? AND wa.actor_type = ? AND wr.status = 'pending'`,
        [driverId, DRIVER_ACTOR_TYPE]
    );
    return Number(rows[0]?.cnt || 0);
}

// ─── Topup payments ───────────────────────────────────────────────────────────

/**
 * Insert a new pending topup payment record.
 * Does NOT touch wallet balance — balance is credited only in the callback.
 */
export async function insertDriverTopupPayment(
    { walletId, driverId, currencyId, amount, gatewayName, note, paymentCode },
    conn = null
) {
    const [result] = await db(conn).query(
        `INSERT INTO payments
         (payment_code, payer_wallet_id, actor_type, actor_id,
          service_domain, amount, currency_id, status, gateway_name, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
            paymentCode,
            walletId,
            DRIVER_ACTOR_TYPE,
            driverId,
            SERVICE_DOMAIN_WALLET_TOPUP,
            amount,
            currencyId,
            gatewayName || null,
            note || "Wallet top-up",
        ]
    );
    return Number(result.insertId);
}

/**
 * Find a topup payment by payment_code scoped to the requesting driver.
 * Used by the driver to poll their own payment status (GET /topup/:paymentCode).
 */
export async function findDriverPaymentByCode(driverId, paymentCode, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT payment_id, payment_code, payer_wallet_id, actor_type, actor_id,
                service_domain, amount, currency_id, status,
                gateway_name, gateway_transaction_ref, description, created_at
         FROM payments
         WHERE payment_code = ?
           AND actor_type   = ?
           AND actor_id     = ?
           AND service_domain = ?
         LIMIT 1`,
        [paymentCode, DRIVER_ACTOR_TYPE, driverId, SERVICE_DOMAIN_WALLET_TOPUP]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        payment_id:              Number(row.payment_id),
        payment_code:            row.payment_code,
        payer_wallet_id:         row.payer_wallet_id ? Number(row.payer_wallet_id) : null,
        amount:                  Number(row.amount || 0),
        currency_id:             Number(row.currency_id),
        status:                  row.status,
        gateway_name:            row.gateway_name,
        gateway_transaction_ref: row.gateway_transaction_ref,
        description:             row.description,
        created_at:              row.created_at,
    };
}

/**
 * Find a driver topup payment by payment_code without driver-ID scoping.
 * Used by the gateway callback handler where no driver JWT is present.
 * Acquires FOR UPDATE lock when called inside a transaction (forUpdate=true).
 */
export async function findTopupPaymentByCode(paymentCode, conn = null, forUpdate = false) {
    const lock = forUpdate ? " FOR UPDATE" : "";
    const [rows] = await db(conn).query(
        `SELECT payment_id, payment_code, payer_wallet_id, actor_type, actor_id,
                service_domain, amount, currency_id, status,
                gateway_name, gateway_transaction_ref, description, created_at
         FROM payments
         WHERE payment_code   = ?
           AND actor_type     = ?
           AND service_domain = ?
         LIMIT 1${lock}`,
        [paymentCode, DRIVER_ACTOR_TYPE, SERVICE_DOMAIN_WALLET_TOPUP]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        payment_id:              Number(row.payment_id),
        payment_code:            row.payment_code,
        payer_wallet_id:         row.payer_wallet_id ? Number(row.payer_wallet_id) : null,
        actor_id:                Number(row.actor_id),
        amount:                  Number(row.amount || 0),
        currency_id:             Number(row.currency_id),
        status:                  row.status,
        gateway_name:            row.gateway_name,
        gateway_transaction_ref: row.gateway_transaction_ref,
        description:             row.description,
        created_at:              row.created_at,
    };
}

/**
 * Update payment status and optionally set gateway_transaction_ref.
 * Uses COALESCE so a null gatewayRef does not overwrite an existing ref.
 */
export async function updatePaymentStatus(paymentId, { status, gatewayRef = null }, conn = null) {
    await db(conn).query(
        `UPDATE payments
         SET status                  = ?,
             gateway_transaction_ref = COALESCE(?, gateway_transaction_ref),
             updated_at              = NOW()
         WHERE payment_id = ?
         LIMIT 1`,
        [status, gatewayRef, paymentId]
    );
}

// ─── Driver bank info ─────────────────────────────────────────────────────────

/**
 * Read bank information directly from the drivers table.
 * Returns null if driver not found.
 */
export async function findDriverBankInfo(driverId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT bank_name, bank_acc_holder_name, bank_acc_num, bank_code, bank_swift_code
         FROM drivers
         WHERE driver_id = ?
         LIMIT 1`,
        [driverId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        bank_name:            row.bank_name,
        bank_acc_holder_name: row.bank_acc_holder_name,
        bank_acc_num:         row.bank_acc_num,
        bank_code:            row.bank_code,
        bank_swift_code:      row.bank_swift_code,
    };
}

// ─── Single withdrawal detail ─────────────────────────────────────────────────

/**
 * Fetch one withdrawal request that belongs to the driver's wallet.
 * Scoped join ensures a driver cannot view another driver's withdrawal.
 */
export async function findDriverWithdrawalById(driverId, withdrawalId, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT wr.withdrawal_id AS id,
                wr.wallet_id,
                wr.amount,
                wr.status,
                wr.note,
                wr.requested_at,
                wr.processed_at
         FROM withdrawal_requests wr
         INNER JOIN wallet_accounts wa ON wa.wallet_id = wr.wallet_id
         WHERE wr.withdrawal_id = ?
           AND wa.actor_type    = ?
           AND wa.actor_id      = ?
         LIMIT 1`,
        [withdrawalId, DRIVER_ACTOR_TYPE, driverId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id:           Number(row.id),
        wallet_id:    Number(row.wallet_id),
        amount:       Number(row.amount || 0),
        status:       row.status,
        note:         row.note,
        requested_at: row.requested_at,
        processed_at: row.processed_at,
    };
}
