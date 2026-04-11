import sqldb from "../config/sqldatabase.js";

function db(conn = null) {
    return conn || sqldb;
}

export async function findSettingsByKeys(keys, conn = null) {
    if (!Array.isArray(keys) || keys.length === 0) {
        return [];
    }

    const placeholders = keys.map(() => "?").join(", ");
    const [rows] = await db(conn).query(
        `SELECT setting_key, setting_value, value_type, updated_at
         FROM system_settings
         WHERE setting_key IN (${placeholders})`,
        keys
    );

    return rows;
}

export async function upsertSettings(entries, updatedBy = null, conn = null) {
    if (!Array.isArray(entries) || entries.length === 0) return;

    const valuesSql = entries.map(() => "(?, ?, ?, ?)").join(", ");
    const params = [];

    for (const entry of entries) {
        params.push(entry.setting_key, entry.setting_value, entry.value_type, updatedBy);
    }

    await db(conn).query(
        `INSERT INTO system_settings (setting_key, setting_value, value_type, updated_by)
         VALUES ${valuesSql}
         ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            value_type = VALUES(value_type),
            updated_by = VALUES(updated_by),
            updated_at = CURRENT_TIMESTAMP`,
        params
    );
}

// ─── Currency ────────────────────────────────────────────────────────────────

export async function findAllCurrencies(conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, name, iso_code, symbol, exchng_rate, \`default\`, date_created
         FROM currencies
         ORDER BY \`default\` DESC, id ASC`
    );
    return rows;
}

export async function findCurrencyById(id, conn = null) {
    const [rows] = await db(conn).query(
        `SELECT id, name, iso_code, symbol, exchng_rate, \`default\`, date_created
         FROM currencies WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
}

export async function findCurrencyByIsoCode(isoCode, excludeId = null, conn = null) {
    const sql = excludeId
        ? `SELECT id FROM currencies WHERE iso_code = ? AND id <> ? LIMIT 1`
        : `SELECT id FROM currencies WHERE iso_code = ? LIMIT 1`;
    const params = excludeId ? [isoCode, excludeId] : [isoCode];
    const [rows] = await db(conn).query(sql, params);
    return rows[0] || null;
}

export async function insertCurrency(payload, conn = null) {
    const [result] = await db(conn).query(
        `INSERT INTO currencies (name, iso_code, symbol, exchng_rate, \`default\`)
         VALUES (?, ?, ?, ?, ?)`,
        [payload.name, payload.iso_code, payload.symbol, payload.exchng_rate, payload.is_default ? 1 : 0]
    );
    return Number(result.insertId);
}

export async function updateCurrency(id, payload, conn = null) {
    await db(conn).query(
        `UPDATE currencies SET name = ?, iso_code = ?, symbol = ?, exchng_rate = ? WHERE id = ?`,
        [payload.name, payload.iso_code, payload.symbol, payload.exchng_rate, id]
    );
}

export async function clearDefaultCurrency(conn = null) {
    await db(conn).query(`UPDATE currencies SET \`default\` = 0`);
}

export async function setDefaultCurrencyById(id, conn = null) {
    await db(conn).query(`UPDATE currencies SET \`default\` = 1 WHERE id = ?`, [id]);
}
