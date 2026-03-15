import "dotenv/config";
import sqldb from "../config/sqldatabase.js";
import { hashPassword } from "../utils/password.js";

const defaults = {
    firstname: "System",
    lastname: "Admin",
    email: "admin@thuexe.local",
    phone: "+84900000001",
    password: "Admin@12345!",
};

function getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    if (index < 0) return "";
    return String(process.argv[index + 1] || "").trim();
}

function buildPayload() {
    return {
        firstname: getArgValue("--firstname") || process.env.ADMIN_SEED_FIRSTNAME || defaults.firstname,
        lastname: getArgValue("--lastname") || process.env.ADMIN_SEED_LASTNAME || defaults.lastname,
        email: (getArgValue("--email") || process.env.ADMIN_SEED_EMAIL || defaults.email).toLowerCase(),
        phone: getArgValue("--phone") || process.env.ADMIN_SEED_PHONE || defaults.phone,
        password: getArgValue("--password") || process.env.ADMIN_SEED_PASSWORD || defaults.password,
    };
}

function validatePayload(payload) {
    const issues = [];

    if (payload.firstname.length < 2 || payload.firstname.length > 64) {
        issues.push("firstname must be between 2 and 64 characters");
    }

    if (payload.lastname.length < 2 || payload.lastname.length > 64) {
        issues.push("lastname must be between 2 and 64 characters");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        issues.push("email is invalid");
    }

    if (!/^\+?\d{8,15}$/.test(payload.phone)) {
        issues.push("phone is invalid");
    }

    const password = payload.password;
    if (password.length < 10 || password.length > 128) {
        issues.push("password length must be between 10 and 128 characters");
    }
    if (!/[A-Z]/.test(password)) {
        issues.push("password must include at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
        issues.push("password must include at least one lowercase letter");
    }
    if (!/\d/.test(password)) {
        issues.push("password must include at least one number");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        issues.push("password must include at least one special character");
    }

    return issues;
}

async function findExistingIdentifier(email, phone) {
    const [userRows] = await sqldb.query(
        "SELECT user_id, email, phone, account_type FROM users WHERE email = ? OR phone = ? LIMIT 1",
        [email, phone]
    );

    if (userRows[0]) {
        return {
            table: "users",
            id: Number(userRows[0].user_id),
            accountType: Number(userRows[0].account_type || 1),
        };
    }

    const [driverRows] = await sqldb.query(
        "SELECT driver_id FROM drivers WHERE email = ? OR phone = ? LIMIT 1",
        [email, phone]
    );

    if (driverRows[0]) {
        return {
            table: "drivers",
            id: Number(driverRows[0].driver_id),
        };
    }

    return null;
}

async function seedAdmin() {
    const payload = buildPayload();
    const issues = validatePayload(payload);

    if (issues.length > 0) {
        console.error("Invalid seed payload:");
        issues.forEach((issue) => console.error(`- ${issue}`));
        process.exitCode = 1;
        return;
    }

    const existing = await findExistingIdentifier(payload.email, payload.phone);

    if (existing) {
        if (existing.table === "users" && existing.accountType === 3) {
            console.log(`Admin already exists in users table with id=${existing.id}. No changes made.`);
            return;
        }

        console.error(
            `Cannot seed admin because identifier already exists in ${existing.table} (id=${existing.id}).`
        );
        process.exitCode = 1;
        return;
    }

    const passwordHash = await hashPassword(payload.password);

    const [insertResult] = await sqldb.query(
        `INSERT INTO users
        (password_hash, firstname, lastname, email, phone, country,
         account_type, route_id, is_activated, account_deleted, account_active,
         disp_lang, country_code, country_dial_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            passwordHash,
            payload.firstname,
            payload.lastname,
            payload.email,
            payload.phone,
            "Vietnam",
            3,
            1,
            1,
            0,
            1,
            "vi",
            "vn",
            "+84",
        ]
    );

    const userId = Number(insertResult.insertId);

    console.log("Admin account created successfully.");
    console.log(`user_id=${userId}`);
    console.log(`email=${payload.email}`);
    console.log(`phone=${payload.phone}`);
    console.log(`password=${payload.password}`);
}

try {
    await seedAdmin();
} catch (error) {
    console.error("Failed to seed admin account:", error.message);
    process.exitCode = 1;
} finally {
    await sqldb.end();
}
