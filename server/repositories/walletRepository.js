import sqldb from "../config/sqldatabase.js";

function dbConnection(conn) {
    return conn || sqldb;
}

const ACTOR_TYPE_TO_TABLE = {
    0: { table: "users", idColumn: "user_id", nameExpr: "CONCAT(COALESCE(firstname,''), ' ', COALESCE(lastname,''))" },
    1: { table: "drivers", idColumn: "driver_id", nameExpr: "CONCAT(COALESCE(firstname,''), ' ', COALESCE(lastname,''))" },
    2: { table: "vehicle_owners", idColumn: "owner_id", nameExpr: "fullname" },
    3: { table: "users", idColumn: "user_id", nameExpr: "CONCAT(COALESCE(firstname,''), ' ', COALESCE(lastname,''))" },
};

export async function findDefaultCurrencyId() {
    const [rows] = await sqldb.query(
        `SELECT id FROM currencies ORDER BY \`default\` DESC, id ASC LIMIT 1`
    );
    return Number(rows[0]?.id || 1);
}

export async function findWalletByActor({ actorType, actorId }, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT wallet_id, actor_type, actor_id, currency_id, balance, status, created_at
         FROM wallet_accounts
         WHERE actor_type = ? AND actor_id = ?
         LIMIT 1`,
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
        created_at: row.created_at,
    };
}

export async function createWalletAccount({ actorType, actorId, currencyId }, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO wallet_accounts (actor_type, actor_id, currency_id, balance, status)
         VALUES (?, ?, ?, 0, 1)`,
        [actorType, actorId, currencyId]
    );
    return Number(result.insertId);
}

export async function findOrCreateWallet({ actorType, actorId, currencyId }, conn) {
    const wallet = await findWalletByActor({ actorType, actorId }, conn);
    if (wallet) return wallet;
    const walletId = await createWalletAccount({ actorType, actorId, currencyId }, conn);
    return findWalletByActor({ actorType, actorId }, conn) || { wallet_id: walletId, actor_type: actorType, actor_id: actorId, currency_id: currencyId, balance: 0, status: 1 };
}

export async function findWalletByIdForUpdate(walletId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT wallet_id, actor_type, actor_id, currency_id, balance, status
         FROM wallet_accounts
         WHERE wallet_id = ?
         LIMIT 1
         FOR UPDATE`,
        [walletId]
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

export async function updateWalletBalance(walletId, balance, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE wallet_accounts
         SET balance = ?
         WHERE wallet_id = ?
         LIMIT 1`,
        [balance, walletId]
    );
}

export async function updateWalletStatus(walletId, status, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE wallet_accounts
         SET status = ?
         WHERE wallet_id = ?
         LIMIT 1`,
        [status, walletId]
    );
}

export async function insertWalletLedger(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
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

export async function insertPayment(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO payments
         (payment_code, payer_wallet_id, actor_type, actor_id, service_domain, booking_id, rental_id, gateway_name, gateway_transaction_ref, amount, currency_id, status, description)
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
            payload.status || "paid",
            payload.description || null,
        ]
    );
    return Number(result.insertId);
}

export async function insertWithdrawalRequest({ walletId, amount, note }, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO withdrawal_requests (wallet_id, amount, status, note)
         VALUES (?, ?, 'pending', ?)`,
        [walletId, amount, note || null]
    );
    return Number(result.insertId);
}

export async function findWithdrawalByIdForUpdate(withdrawalId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT withdrawal_id, wallet_id, amount, status, note, requested_at, processed_at
         FROM withdrawal_requests
         WHERE withdrawal_id = ?
         LIMIT 1
         FOR UPDATE`,
        [withdrawalId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        withdrawal_id: Number(row.withdrawal_id),
        wallet_id: Number(row.wallet_id),
        amount: Number(row.amount || 0),
        status: row.status,
        note: row.note,
        requested_at: row.requested_at,
        processed_at: row.processed_at,
    };
}

export async function updateWithdrawalStatus({ withdrawalId, status, note }, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE withdrawal_requests
         SET status = ?, note = ?, processed_at = CASE WHEN ? = 'pending' THEN NULL ELSE NOW() END
         WHERE withdrawal_id = ?
         LIMIT 1`,
        [status, note || null, status, withdrawalId]
    );
}

export async function listWalletLedgerByWallet(walletId, { limit = 100, offset = 0 } = {}) {
    const [rows] = await sqldb.query(
        `SELECT ledger_id, wallet_id, payment_id, amount, balance_after, direction, entry_type, source_type, source_id, description, created_at
         FROM wallet_ledger
         WHERE wallet_id = ?
         ORDER BY ledger_id DESC
         LIMIT ? OFFSET ?`,
        [walletId, limit, offset]
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
    }));
}

export async function countWalletLedgerByWallet(walletId) {
    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items
         FROM wallet_ledger
         WHERE wallet_id = ?`,
        [walletId]
    );
    return Number(rows[0]?.total_items || 0);
}

export async function listWithdrawalsByWallet(walletId, { limit = 100, offset = 0 } = {}) {
    const [rows] = await sqldb.query(
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

export async function findBookingForWalletPayment(bookingId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, user_id, estimated_cost, actual_cost, paid_amount, haspaid, payment_type, status
         FROM bookings
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [bookingId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id: Number(row.id),
        user_id: Number(row.user_id),
        estimated_cost: Number(row.estimated_cost || 0),
        actual_cost: Number(row.actual_cost || 0),
        paid_amount: Number(row.paid_amount || 0),
        haspaid: Number(row.haspaid || 0),
        payment_type: row.payment_type === null ? null : Number(row.payment_type),
        status: Number(row.status || 0),
    };
}

export async function markBookingPaidByWallet({ bookingId, paymentId, amount }, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE bookings
         SET haspaid = 1,
             payment_type = 2,
             paid_amount = ?,
             transaction_id = ?
         WHERE id = ?
         LIMIT 1`,
        [amount, paymentId, bookingId]
    );
}

export async function findRentalForWalletPayment(rentalId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT rental_id, user_id, total_price, payment_status, payment_type
         FROM rental_bookings
         WHERE rental_id = ?
         LIMIT 1
         FOR UPDATE`,
        [rentalId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        rental_id: Number(row.rental_id),
        user_id: Number(row.user_id),
        total_price: Number(row.total_price || 0),
        payment_status: row.payment_status,
        payment_type: row.payment_type === null ? null : Number(row.payment_type),
    };
}

export async function markRentalPaidByWallet({ rentalId, paymentId }, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE rental_bookings
         SET payment_status = 'paid',
             payment_type = 2,
             transaction_id = ?
         WHERE rental_id = ?
         LIMIT 1`,
        [paymentId, rentalId]
    );
}

export async function listWalletAccounts(filters = {}) {
    const whereClauses = [];
    const params = [];
    if (filters.actorType !== undefined) {
        whereClauses.push("wa.actor_type = ?");
        params.push(filters.actorType);
    }
    if (filters.status !== undefined) {
        whereClauses.push("wa.status = ?");
        params.push(filters.status);
    }
    if (filters.search) {
        const keyword = `%${filters.search}%`;
        whereClauses.push(
            `(CAST(wa.actor_id AS CHAR) LIKE ? OR CAST(wa.wallet_id AS CHAR) LIKE ? OR u.phone LIKE ? OR d.phone LIKE ? OR vo.phone LIKE ? OR su.phone LIKE ?)`
        );
        params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
    const page = Math.max(Number(filters.page) || 1, 1);
    const offset = (page - 1) * limit;

    const [rows] = await sqldb.query(
        `SELECT
            wa.wallet_id, wa.actor_type, wa.actor_id, wa.currency_id, wa.balance, wa.status, wa.created_at,
            c.iso_code AS currency_code, c.symbol AS currency_symbol,
            NULLIF(TRIM(CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.lastname,''))), '') AS user_name,
            u.phone AS user_phone,
            NULLIF(TRIM(CONCAT(COALESCE(d.firstname,''), ' ', COALESCE(d.lastname,''))), '') AS driver_name,
            d.phone AS driver_phone,
            vo.fullname AS owner_name,
            vo.phone AS owner_phone,
            NULLIF(TRIM(CONCAT(COALESCE(su.firstname,''), ' ', COALESCE(su.lastname,''))), '') AS staff_name,
            su.phone AS staff_phone
         FROM wallet_accounts wa
         LEFT JOIN currencies c ON c.id = wa.currency_id
         LEFT JOIN users u ON wa.actor_type = 0 AND u.user_id = wa.actor_id
         LEFT JOIN drivers d ON wa.actor_type = 1 AND d.driver_id = wa.actor_id
         LEFT JOIN vehicle_owners vo ON wa.actor_type = 2 AND vo.owner_id = wa.actor_id
         LEFT JOIN users su ON wa.actor_type = 3 AND su.user_id = wa.actor_id AND su.account_type IN (2, 3)
         ${whereSql}
         ORDER BY wa.wallet_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const [countRows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items
         FROM wallet_accounts wa
         LEFT JOIN users u ON wa.actor_type = 0 AND u.user_id = wa.actor_id
         LEFT JOIN drivers d ON wa.actor_type = 1 AND d.driver_id = wa.actor_id
         LEFT JOIN vehicle_owners vo ON wa.actor_type = 2 AND vo.owner_id = wa.actor_id
         LEFT JOIN users su ON wa.actor_type = 3 AND su.user_id = wa.actor_id AND su.account_type IN (2, 3)
         ${whereSql}`,
        params
    );

    return {
        items: rows.map((row) => ({
            wallet_id: Number(row.wallet_id),
            actor_type: Number(row.actor_type),
            actor_id: Number(row.actor_id),
            currency_id: Number(row.currency_id),
            currency_code: row.currency_code,
            currency_symbol: row.currency_symbol,
            balance: Number(row.balance || 0),
            status: Number(row.status || 0),
            created_at: row.created_at,
            actor_name: row.user_name || row.driver_name || row.owner_name || row.staff_name || null,
            actor_phone: row.user_phone || row.driver_phone || row.owner_phone || row.staff_phone || null,
        })),
        totalItems: Number(countRows[0]?.total_items || 0),
        page,
        limit,
    };
}

export async function listLedgerEntries(filters = {}) {
    const whereClauses = [];
    const params = [];

    if (filters.actorType !== undefined) {
        whereClauses.push("wa.actor_type = ?");
        params.push(filters.actorType);
    }
    if (filters.actorId !== undefined) {
        whereClauses.push("wa.actor_id = ?");
        params.push(filters.actorId);
    }
    if (filters.direction) {
        whereClauses.push("wl.direction = ?");
        params.push(filters.direction);
    }
    if (filters.entryType) {
        whereClauses.push("wl.entry_type = ?");
        params.push(filters.entryType);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
    const page = Math.max(Number(filters.page) || 1, 1);
    const offset = (page - 1) * limit;

    const [rows] = await sqldb.query(
        `SELECT
            wl.ledger_id, wl.wallet_id, wl.payment_id, wl.amount, wl.balance_after, wl.direction,
            wl.entry_type, wl.source_type, wl.source_id, wl.description, wl.created_at,
            wa.actor_type, wa.actor_id
         FROM wallet_ledger wl
         INNER JOIN wallet_accounts wa ON wa.wallet_id = wl.wallet_id
         ${whereSql}
         ORDER BY wl.ledger_id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const [countRows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items
         FROM wallet_ledger wl
         INNER JOIN wallet_accounts wa ON wa.wallet_id = wl.wallet_id
         ${whereSql}`,
        params
    );

    return {
        items: rows.map((row) => ({
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
            actor_type: Number(row.actor_type),
            actor_id: Number(row.actor_id),
        })),
        totalItems: Number(countRows[0]?.total_items || 0),
        page,
        limit,
    };
}

export async function listPendingWithdrawals() {
    const [rows] = await sqldb.query(
        `SELECT wr.withdrawal_id, wr.wallet_id, wr.amount, wr.status, wr.note, wr.requested_at,
                wa.actor_type, wa.actor_id,
                COALESCE(
                    CASE
                        WHEN wa.actor_type IN (0, 3) THEN CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, ''))
                        WHEN wa.actor_type = 1 THEN CONCAT(COALESCE(d.firstname, ''), ' ', COALESCE(d.lastname, ''))
                        WHEN wa.actor_type = 2 THEN vo.fullname
                        ELSE NULL
                    END,
                    ''
                ) AS actor_name,
                CASE
                    WHEN wa.actor_type IN (0, 3) THEN uba.bank_name
                    WHEN wa.actor_type = 1 THEN d.bank_name
                    WHEN wa.actor_type = 2 THEN vo.bank_name
                    ELSE NULL
                END AS payout_bank_name,
                CASE
                    WHEN wa.actor_type IN (0, 3) THEN uba.bank_account_number
                    WHEN wa.actor_type = 1 THEN d.bank_acc_num
                    WHEN wa.actor_type = 2 THEN vo.bank_account
                    ELSE NULL
                END AS payout_bank_account,
                CASE
                    WHEN wa.actor_type IN (0, 3) THEN uba.bank_account_holder
                    WHEN wa.actor_type = 1 THEN d.bank_acc_holder_name
                    WHEN wa.actor_type = 2 THEN vo.fullname
                    ELSE NULL
                END AS payout_bank_holder,
                CASE
                    WHEN wa.actor_type IN (0, 3) THEN uba.bank_code
                    WHEN wa.actor_type = 1 THEN d.bank_code
                    WHEN wa.actor_type = 2 THEN vo.bank_code
                    ELSE NULL
                END AS payout_bank_code,
                CASE
                    WHEN wa.actor_type = 1 THEN d.bank_swift_code
                    WHEN wa.actor_type = 2 THEN vo.swift_code
                    ELSE NULL
                END AS payout_bank_swift_code
         FROM withdrawal_requests wr
         INNER JOIN wallet_accounts wa ON wa.wallet_id = wr.wallet_id
         LEFT JOIN users u ON wa.actor_type IN (0, 3) AND u.user_id = wa.actor_id
         LEFT JOIN drivers d ON wa.actor_type = 1 AND d.driver_id = wa.actor_id
         LEFT JOIN vehicle_owners vo ON wa.actor_type = 2 AND vo.owner_id = wa.actor_id
         LEFT JOIN user_bank_accounts uba
                ON wa.actor_type IN (0, 3)
               AND uba.user_id = wa.actor_id
               AND uba.bank_account_id = (
                    SELECT ub2.bank_account_id
                    FROM user_bank_accounts ub2
                    WHERE ub2.user_id = wa.actor_id
                    ORDER BY ub2.is_default DESC, ub2.bank_account_id DESC
                    LIMIT 1
               )
         ORDER BY wr.withdrawal_id DESC`
    );
    return rows.map((row) => ({
        withdrawal_id: Number(row.withdrawal_id),
        wallet_id: Number(row.wallet_id),
        amount: Number(row.amount || 0),
        status: row.status,
        note: row.note,
        requested_at: row.requested_at,
        actor_type: Number(row.actor_type),
        actor_id: Number(row.actor_id),
        actor_name: row.actor_name ? String(row.actor_name).trim() : null,
        payout_bank_name: row.payout_bank_name || null,
        payout_bank_account: row.payout_bank_account || null,
        payout_bank_holder: row.payout_bank_holder || null,
        payout_bank_code: row.payout_bank_code || null,
        payout_bank_swift_code: row.payout_bank_swift_code || null,
    }));
}

export async function walletOverview() {
    const [rows] = await sqldb.query(
        `SELECT
            COUNT(*) AS total_wallets,
            SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS active_wallets,
            SUM(balance) AS total_balance,
            SUM(CASE WHEN actor_type = 0 THEN balance ELSE 0 END) AS user_balance,
            SUM(CASE WHEN actor_type = 1 THEN balance ELSE 0 END) AS driver_balance,
            SUM(CASE WHEN actor_type = 2 THEN balance ELSE 0 END) AS owner_balance
         FROM wallet_accounts`
    );

    const [pendingRows] = await sqldb.query(
        `SELECT COUNT(*) AS pending_count, COALESCE(SUM(amount), 0) AS pending_amount
         FROM withdrawal_requests
         WHERE status = 'pending'`
    );

    return {
        total_wallets: Number(rows[0]?.total_wallets || 0),
        active_wallets: Number(rows[0]?.active_wallets || 0),
        total_balance: Number(rows[0]?.total_balance || 0),
        user_balance: Number(rows[0]?.user_balance || 0),
        driver_balance: Number(rows[0]?.driver_balance || 0),
        owner_balance: Number(rows[0]?.owner_balance || 0),
        pending_withdrawals: {
            count: Number(pendingRows[0]?.pending_count || 0),
            amount: Number(pendingRows[0]?.pending_amount || 0),
        },
    };
}

export function getActorTableConfig(actorType) {
    return ACTOR_TYPE_TO_TABLE[actorType] || null;
}
