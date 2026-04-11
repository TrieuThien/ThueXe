import sqldb from "../config/sqldatabase.js";
import {
    findSettingsByKeys,
    upsertSettings,
    findAllCurrencies,
    findCurrencyById,
    findCurrencyByIsoCode,
    insertCurrency,
    updateCurrency,
    clearDefaultCurrency,
    setDefaultCurrencyById,
} from "../repositories/settingsRepository.js";
import AppError from "../utils/appError.js";

const SETTINGS_SCHEMA = {
    driver_commission_rate: { type: "number", defaultValue: 20, min: 0, max: 100 },
    cancel_fee: { type: "number", defaultValue: 15000, min: 0, max: 1000000000 },
    free_waiting_minutes: { type: "number", defaultValue: 5, min: 0, max: 180 },
    max_service_radius_km: { type: "number", defaultValue: 25, min: 1, max: 1000 },
    paypal_client_id: { type: "string", defaultValue: "", maxLength: 255 },
    google_maps_api_key: { type: "string", defaultValue: "", maxLength: 255 },
};

const SETTINGS_KEYS = Object.keys(SETTINGS_SCHEMA);

function normalizeNumberSetting(value, schema, key) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new AppError(`${key} must be a valid number.`, 422, "INVALID_SETTINGS_VALUE");
    }
    if (parsed < schema.min || parsed > schema.max) {
        throw new AppError(
            `${key} must be between ${schema.min} and ${schema.max}.`,
            422,
            "INVALID_SETTINGS_VALUE"
        );
    }
    return parsed;
}

function normalizeStringSetting(value, schema) {
    if (value === undefined || value === null) return "";
    const text = String(value).trim();
    if (text.length > schema.maxLength) {
        return text.slice(0, schema.maxLength);
    }
    return text;
}

function mapRowsToSettings(rows) {
    const byKey = new Map(rows.map((row) => [row.setting_key, row]));
    const settings = {};

    for (const key of SETTINGS_KEYS) {
        const schema = SETTINGS_SCHEMA[key];
        const row = byKey.get(key);
        const rawValue = row?.setting_value;

        if (rawValue === undefined || rawValue === null || rawValue === "") {
            settings[key] = schema.defaultValue;
            continue;
        }

        if (schema.type === "number") {
            const parsed = Number(rawValue);
            settings[key] = Number.isFinite(parsed) ? parsed : schema.defaultValue;
        } else {
            settings[key] = String(rawValue);
        }
    }

    return settings;
}

async function runInTransaction(work) {
    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();
        const result = await work(conn);
        await conn.commit();
        return result;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function getSystemSettingsService() {
    const rows = await findSettingsByKeys(SETTINGS_KEYS);
    return mapRowsToSettings(rows);
}

export async function updateSystemSettingsService(auth, payload = {}) {
    const entries = SETTINGS_KEYS.map((key) => {
        const schema = SETTINGS_SCHEMA[key];
        const incomingValue = Object.prototype.hasOwnProperty.call(payload, key)
            ? payload[key]
            : schema.defaultValue;

        const normalized =
            schema.type === "number"
                ? normalizeNumberSetting(incomingValue, schema, key)
                : normalizeStringSetting(incomingValue, schema);

        return {
            setting_key: key,
            setting_value: schema.type === "number" ? String(normalized) : normalized,
            value_type: schema.type,
        };
    });

    await runInTransaction(async (conn) => {
        await upsertSettings(entries, Number(auth.userId), conn);
    });

    return getSystemSettingsService();
}

// ─── Currency ────────────────────────────────────────────────────────────────

function serializeCurrency(row) {
    return {
        id: Number(row.id),
        name: String(row.name),
        iso_code: String(row.iso_code),
        symbol: String(row.symbol),
        exchng_rate: Number(row.exchng_rate),
        is_default: Number(row.default) === 1,
        date_created: row.date_created,
    };
}

function normalizeCurrencyPayload(payload) {
    const name = String(payload.name || "").trim();
    const iso_code = String(payload.iso_code || "").trim().toUpperCase();
    const symbol = String(payload.symbol || "").trim();
    const exchng_rate = Number(payload.exchng_rate);

    if (!name || name.length > 50)
        throw new AppError("Currency name is required and must not exceed 50 characters.", 422, "INVALID_CURRENCY");
    if (!iso_code || iso_code.length > 4)
        throw new AppError("ISO code is required and must not exceed 4 characters.", 422, "INVALID_CURRENCY");
    if (!symbol || symbol.length > 10)
        throw new AppError("Symbol is required and must not exceed 10 characters.", 422, "INVALID_CURRENCY");
    if (!Number.isFinite(exchng_rate) || exchng_rate < 0)
        throw new AppError("Exchange rate must be a non-negative number.", 422, "INVALID_CURRENCY");

    return { name, iso_code, symbol, exchng_rate };
}

export async function getCurrenciesService() {
    const rows = await findAllCurrencies();
    return rows.map(serializeCurrency);
}

export async function createCurrencyService(payload) {
    const normalized = normalizeCurrencyPayload(payload);
    const is_default = Boolean(payload.is_default);

    const existing = await findCurrencyByIsoCode(normalized.iso_code);
    if (existing) {
        throw new AppError(`ISO code "${normalized.iso_code}" already exists.`, 409, "CURRENCY_ISO_DUPLICATE");
    }

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();

        if (is_default) {
            await clearDefaultCurrency(conn);
        }

        const id = await insertCurrency({ ...normalized, is_default }, conn);
        await conn.commit();

        const row = await findCurrencyById(id);
        return serializeCurrency(row);
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function updateCurrencyService(id, payload) {
    const currencyId = Number(id);
    if (!Number.isInteger(currencyId) || currencyId < 1)
        throw new AppError("Invalid currency id.", 422, "INVALID_CURRENCY_ID");

    const existing = await findCurrencyById(currencyId);
    if (!existing) throw new AppError("Currency not found.", 404, "CURRENCY_NOT_FOUND");

    const normalized = normalizeCurrencyPayload(payload);

    const duplicate = await findCurrencyByIsoCode(normalized.iso_code, currencyId);
    if (duplicate) {
        throw new AppError(`ISO code "${normalized.iso_code}" already exists.`, 409, "CURRENCY_ISO_DUPLICATE");
    }

    await updateCurrency(currencyId, normalized);
    const updated = await findCurrencyById(currencyId);
    return serializeCurrency(updated);
}

export async function setDefaultCurrencyService(id) {
    const currencyId = Number(id);
    if (!Number.isInteger(currencyId) || currencyId < 1)
        throw new AppError("Invalid currency id.", 422, "INVALID_CURRENCY_ID");

    const existing = await findCurrencyById(currencyId);
    if (!existing) throw new AppError("Currency not found.", 404, "CURRENCY_NOT_FOUND");

    const conn = await sqldb.getConnection();
    try {
        await conn.beginTransaction();
        await clearDefaultCurrency(conn);
        await setDefaultCurrencyById(currencyId, conn);
        await conn.commit();
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }

    const rows = await findAllCurrencies();
    return rows.map(serializeCurrency);
}
