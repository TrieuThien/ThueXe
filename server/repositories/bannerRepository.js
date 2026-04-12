import sqldb from "../config/sqldatabase.js";

function dbConnection(conn) {
    return conn || sqldb;
}

function mapBanner(row) {
    if (!row) return null;

    return {
        id: Number(row.id),
        title: row.title || "",
        excerpt: row.excerpt || "",
        content: row.content || "",
        city: Number(row.city || 0),
        city_name: row.city_name || null,
        feature_img: row.feature_img || "",
        visibility: Number(row.visibility || 0),
        status: Number(row.status || 0),
        date_created: row.date_created,
    };
}

export async function findBannerAdminMeta() {
    const [routes] = await sqldb.query(
        `SELECT id, r_title, c_name
         FROM routes
         ORDER BY r_title ASC`
    );

    return {
        cities: routes.map((row) => ({
            id: Number(row.id),
            r_title: row.r_title,
            c_name: row.c_name,
        })),
    };
}

export async function findAdminBanners(filters) {
    const whereClauses = [];
    const params = [];

    if (filters.search) {
        whereClauses.push("(b.title LIKE ? OR b.excerpt LIKE ? OR b.content LIKE ?)");
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.status !== null) {
        whereClauses.push("b.status = ?");
        params.push(filters.status);
    }

    if (filters.city !== null) {
        whereClauses.push("b.city = ?");
        params.push(filters.city);
    }

    if (filters.visibility !== null) {
        whereClauses.push("b.visibility = ?");
        params.push(filters.visibility);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await sqldb.query(
        `SELECT
            b.id,
            b.title,
            b.excerpt,
            b.content,
            b.city,
            b.feature_img,
            b.visibility,
            b.status,
            b.date_created,
            r.r_title AS city_name
         FROM banners b
         LEFT JOIN routes r ON r.id = b.city
         ${whereSql}
         ORDER BY b.id DESC
         LIMIT ? OFFSET ?`,
        [...params, filters.limit, offset]
    );

    return rows.map(mapBanner);
}

export async function countAdminBanners(filters) {
    const whereClauses = [];
    const params = [];

    if (filters.search) {
        whereClauses.push("(title LIKE ? OR excerpt LIKE ? OR content LIKE ?)");
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.status !== null) {
        whereClauses.push("status = ?");
        params.push(filters.status);
    }

    if (filters.city !== null) {
        whereClauses.push("city = ?");
        params.push(filters.city);
    }

    if (filters.visibility !== null) {
        whereClauses.push("visibility = ?");
        params.push(filters.visibility);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items
         FROM banners
         ${whereSql}`,
        params
    );

    return Number(rows[0]?.total_items || 0);
}

export async function findBannerById(bannerId) {
    const [rows] = await sqldb.query(
        `SELECT
            b.id,
            b.title,
            b.excerpt,
            b.content,
            b.city,
            b.feature_img,
            b.visibility,
            b.status,
            b.date_created,
            r.r_title AS city_name
         FROM banners b
         LEFT JOIN routes r ON r.id = b.city
         WHERE b.id = ?
         LIMIT 1`,
        [bannerId]
    );

    return mapBanner(rows[0]);
}

export async function routeExists(routeId) {
    const [rows] = await sqldb.query(
        `SELECT id FROM routes WHERE id = ? LIMIT 1`,
        [routeId]
    );

    return rows.length > 0;
}

export async function insertBanner(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO banners (
            title,
            excerpt,
            content,
            city,
            feature_img,
            visibility,
            status,
            date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            payload.title,
            payload.excerpt,
            payload.content,
            payload.city,
            payload.feature_img || null,
            payload.visibility,
            payload.status,
        ]
    );

    return Number(result.insertId);
}

export async function updateBanner(bannerId, payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE banners
         SET
            title = ?,
            excerpt = ?,
            content = ?,
            city = ?,
            feature_img = ?,
            visibility = ?,
            status = ?
         WHERE id = ?
         LIMIT 1`,
        [
            payload.title,
            payload.excerpt,
            payload.content,
            payload.city,
            payload.feature_img || null,
            payload.visibility,
            payload.status,
            bannerId,
        ]
    );

    return result.affectedRows > 0;
}

export async function updateBannerStatus(bannerId, status, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `UPDATE banners
         SET status = ?
         WHERE id = ?
         LIMIT 1`,
        [status, bannerId]
    );

    return result.affectedRows > 0;
}
