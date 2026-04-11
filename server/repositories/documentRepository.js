import sqldb from "../config/sqldatabase.js";

function dbConnection(conn) {
    return conn || sqldb;
}

function resolveSubmissionTable(actorType) {
    if (actorType === "driver") {
        return {
            table: "driver_documents",
            actorColumn: "driver_id",
        };
    }
    return {
        table: "user_documents",
        actorColumn: "user_id",
    };
}

export async function listDocumentDefinitions(filters = {}) {
    const whereClauses = [];
    const params = [];
    if (Array.isArray(filters.documentIds) && filters.documentIds.length > 0) {
        if (filters.documentIds.length === 1) {
            whereClauses.push("id = ?");
            params.push(filters.documentIds[0]);
        } else {
            const placeholders = filters.documentIds.map(() => "?").join(", ");
            whereClauses.push(`id IN (${placeholders})`);
            params.push(...filters.documentIds);
        }
    }
    if (filters.status !== undefined) {
        whereClauses.push("status = ?");
        params.push(filters.status);
    }
    if (filters.docUser !== undefined) {
        whereClauses.push("doc_user = ?");
        params.push(filters.docUser);
    }
    if (filters.docType !== undefined) {
        whereClauses.push("doc_type = ?");
        params.push(filters.docType);
    }
    if (filters.docCity !== undefined) {
        whereClauses.push("(doc_city = ? OR doc_city IS NULL)");
        params.push(filters.docCity);
    }
    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [rows] = await sqldb.query(
        `SELECT id, title, doc_desc, doc_city, doc_type, doc_user, doc_expiry, doc_id_num, doc_id_num_title, doc_id_num_desc, status, date_created
         FROM documents
         ${whereSql}
         ORDER BY id DESC`,
        params
    );
    return rows.map((row) => ({
        id: Number(row.id),
        title: row.title,
        doc_desc: row.doc_desc,
        doc_city: row.doc_city === null ? null : Number(row.doc_city),
        doc_type: Number(row.doc_type || 0),
        doc_user: Number(row.doc_user || 0),
        doc_expiry: Number(row.doc_expiry || 0),
        doc_id_num: Number(row.doc_id_num || 0),
        doc_id_num_title: row.doc_id_num_title,
        doc_id_num_desc: row.doc_id_num_desc,
        status: Number(row.status || 0),
        date_created: row.date_created,
    }));
}

export async function findDocumentDefinitionById(documentId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT id, title, doc_desc, doc_city, doc_type, doc_user, doc_expiry, doc_id_num, doc_id_num_title, doc_id_num_desc, status, date_created
         FROM documents
         WHERE id = ?
         LIMIT 1`,
        [documentId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id: Number(row.id),
        title: row.title,
        doc_desc: row.doc_desc,
        doc_city: row.doc_city === null ? null : Number(row.doc_city),
        doc_type: Number(row.doc_type || 0),
        doc_user: Number(row.doc_user || 0),
        doc_expiry: Number(row.doc_expiry || 0),
        doc_id_num: Number(row.doc_id_num || 0),
        doc_id_num_title: row.doc_id_num_title,
        doc_id_num_desc: row.doc_id_num_desc,
        status: Number(row.status || 0),
        date_created: row.date_created,
    };
}

export async function createDocumentDefinition(payload, conn) {
    const db = dbConnection(conn);
    const [result] = await db.query(
        `INSERT INTO documents
         (title, doc_desc, doc_city, doc_type, doc_user, doc_expiry, doc_id_num, doc_id_num_title, doc_id_num_desc, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.title,
            payload.doc_desc,
            payload.doc_city || null,
            payload.doc_type,
            payload.doc_user,
            payload.doc_expiry,
            payload.doc_id_num,
            payload.doc_id_num_title,
            payload.doc_id_num_desc,
            payload.status,
        ]
    );
    return Number(result.insertId);
}

export async function updateDocumentDefinition(documentId, payload, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE documents
         SET title = ?, doc_desc = ?, doc_city = ?, doc_type = ?, doc_user = ?, doc_expiry = ?, doc_id_num = ?, doc_id_num_title = ?, doc_id_num_desc = ?, status = ?
         WHERE id = ?
         LIMIT 1`,
        [
            payload.title,
            payload.doc_desc,
            payload.doc_city || null,
            payload.doc_type,
            payload.doc_user,
            payload.doc_expiry,
            payload.doc_id_num,
            payload.doc_id_num_title,
            payload.doc_id_num_desc,
            payload.status,
            documentId,
        ]
    );
}

export async function deleteDocumentDefinition(documentId, conn) {
    const db = dbConnection(conn);
    await db.query(`DELETE FROM documents WHERE id = ? LIMIT 1`, [documentId]);
}

export async function findSubmissionById({ actorType, submissionId }, conn) {
    const db = dbConnection(conn);
    const { table, actorColumn } = resolveSubmissionTable(actorType);
    const [rows] = await db.query(
        `SELECT id, ${actorColumn} AS actor_id, document_id, doc_number, doc_expiry_date, verified, date_submitted
         FROM ${table}
         WHERE id = ?
         LIMIT 1`,
        [submissionId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id: Number(row.id),
        actor_id: Number(row.actor_id),
        document_id: Number(row.document_id),
        doc_number: row.doc_number,
        doc_expiry_date: row.doc_expiry_date,
        verified: Number(row.verified || 0),
        date_submitted: row.date_submitted,
        actor_type: actorType,
    };
}

export async function findSubmissionByActorAndDocument({ actorType, actorId, documentId }, conn) {
    const db = dbConnection(conn);
    const { table, actorColumn } = resolveSubmissionTable(actorType);
    const [rows] = await db.query(
        `SELECT id, ${actorColumn} AS actor_id, document_id, doc_number, doc_expiry_date, verified, date_submitted
         FROM ${table}
         WHERE ${actorColumn} = ? AND document_id = ?
         LIMIT 1`,
        [actorId, documentId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id: Number(row.id),
        actor_id: Number(row.actor_id),
        document_id: Number(row.document_id),
        doc_number: row.doc_number,
        doc_expiry_date: row.doc_expiry_date,
        verified: Number(row.verified || 0),
        date_submitted: row.date_submitted,
        actor_type: actorType,
    };
}

export async function createSubmission({ actorType, actorId, documentId, docNumber, expiryDate }, conn) {
    const db = dbConnection(conn);
    const { table, actorColumn } = resolveSubmissionTable(actorType);
    const [result] = await db.query(
        `INSERT INTO ${table} (${actorColumn}, document_id, doc_number, doc_expiry_date, verified)
         VALUES (?, ?, ?, ?, 0)`,
        [actorId, documentId, docNumber || null, expiryDate || null]
    );
    return Number(result.insertId);
}

export async function updateSubmission({ actorType, submissionId, docNumber, expiryDate }, conn) {
    const db = dbConnection(conn);
    const { table } = resolveSubmissionTable(actorType);
    await db.query(
        `UPDATE ${table}
         SET doc_number = ?, doc_expiry_date = ?, verified = 0, date_submitted = NOW()
         WHERE id = ?
         LIMIT 1`,
        [docNumber || null, expiryDate || null, submissionId]
    );
}

export async function setSubmissionVerification({ actorType, submissionId, verified }, conn) {
    const db = dbConnection(conn);
    const { table } = resolveSubmissionTable(actorType);
    await db.query(
        `UPDATE ${table}
         SET verified = ?
         WHERE id = ?
         LIMIT 1`,
        [verified, submissionId]
    );
}

export async function listMySubmissions({ actorType, actorId }) {
    const { table, actorColumn } = resolveSubmissionTable(actorType);
    const [rows] = await sqldb.query(
        `SELECT s.id, s.${actorColumn} AS actor_id, s.document_id, s.doc_number, s.doc_expiry_date, s.verified, s.date_submitted,
                d.title, d.doc_desc, d.doc_expiry, d.doc_id_num, d.doc_id_num_title
         FROM ${table} s
         LEFT JOIN documents d ON d.id = s.document_id
         WHERE s.${actorColumn} = ?
         ORDER BY s.id DESC`,
        [actorId]
    );
    return rows.map((row) => ({
        id: Number(row.id),
        actor_id: Number(row.actor_id),
        document_id: Number(row.document_id),
        doc_number: row.doc_number,
        doc_expiry_date: row.doc_expiry_date,
        verified: Number(row.verified || 0),
        date_submitted: row.date_submitted,
        title: row.title,
        doc_desc: row.doc_desc,
        doc_expiry: Number(row.doc_expiry || 0),
        doc_id_num: Number(row.doc_id_num || 0),
        doc_id_num_title: row.doc_id_num_title,
    }));
}

export async function listAllSubmissions({ actorType, verified, submissionId, documentId } = {}) {
    const chunks = [];
    const params = [];

    const buildQuery = (kind) => {
        const resolved = resolveSubmissionTable(kind);
        const where = [];
        if (submissionId !== undefined) {
            where.push("s.id = ?");
            params.push(submissionId);
        }
        if (documentId !== undefined) {
            where.push("s.document_id = ?");
            params.push(documentId);
        }
        if (verified !== undefined) {
            where.push("s.verified = ?");
            params.push(verified);
        }
        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const actorNameExpr = kind === "driver"
            ? "CONCAT(COALESCE(d.firstname,''), ' ', COALESCE(d.lastname,''))"
            : "CONCAT(COALESCE(u.firstname,''), ' ', COALESCE(u.lastname,''))";
        const joinSql = kind === "driver"
            ? "LEFT JOIN drivers d ON d.driver_id = s.driver_id"
            : "LEFT JOIN users u ON u.user_id = s.user_id";
        return `SELECT '${kind}' AS actor_type, s.id, s.${resolved.actorColumn} AS actor_id, s.document_id, s.doc_number, s.doc_expiry_date, s.verified, s.date_submitted,
                       d2.title, ${actorNameExpr} AS actor_name
                FROM ${resolved.table} s
                LEFT JOIN documents d2 ON d2.id = s.document_id
                ${joinSql}
                ${whereSql}`;
    };

    if (!actorType || actorType === "user") chunks.push(buildQuery("user"));
    if (!actorType || actorType === "driver") chunks.push(buildQuery("driver"));

    const [rows] = await sqldb.query(
        `${chunks.join(" UNION ALL ")} ORDER BY id DESC`,
        params
    );
    return rows.map((row) => ({
        actor_type: row.actor_type,
        id: Number(row.id),
        actor_id: Number(row.actor_id),
        actor_name: row.actor_name,
        document_id: Number(row.document_id),
        title: row.title,
        doc_number: row.doc_number,
        doc_expiry_date: row.doc_expiry_date,
        verified: Number(row.verified || 0),
        date_submitted: row.date_submitted,
    }));
}

export async function listVehicleSubmissions({
    submissionId,
    documentId,
    vehicleId,
    ownerId,
    verified,
    status,
    docCity,
} = {}) {
    const whereClauses = ["d.doc_user = 2", "d.doc_type = 1"];
    const params = [];

    if (submissionId !== undefined) {
        whereClauses.push("vd.id = ?");
        params.push(submissionId);
    }
    if (documentId !== undefined) {
        whereClauses.push("vd.document_id = ?");
        params.push(documentId);
    }
    if (vehicleId !== undefined) {
        whereClauses.push("vd.vehicle_id = ?");
        params.push(vehicleId);
    }
    if (ownerId !== undefined) {
        whereClauses.push("v.owner_id = ?");
        params.push(ownerId);
    }
    if (verified !== undefined) {
        whereClauses.push("vd.verified = ?");
        params.push(verified);
    }
    if (status !== undefined) {
        whereClauses.push("vd.status = ?");
        params.push(status);
    }
    if (docCity !== undefined) {
        whereClauses.push("(d.doc_city = ? OR d.doc_city IS NULL)");
        params.push(docCity);
    }

    const [rows] = await sqldb.query(
        `SELECT
            vd.id,
            vd.vehicle_id,
            v.owner_id,
            vd.document_id,
            d.title AS document_title,
            d.doc_city,
            vd.doc_number,
            vd.doc_expiry_date,
            vd.file_url,
            vd.mime_type,
            vd.file_size,
            vd.verified,
            vd.status,
            vd.review_note,
            vd.date_submitted,
            vd.updated_at
         FROM vehicle_documents vd
         INNER JOIN documents d ON d.id = vd.document_id
         INNER JOIN vehicles v ON v.vehicle_id = vd.vehicle_id
         WHERE ${whereClauses.join(" AND ")}
         ORDER BY vd.id DESC`,
        params
    );

    return rows.map((row) => ({
        id: Number(row.id),
        vehicle_id: Number(row.vehicle_id),
        owner_id: Number(row.owner_id),
        document_id: Number(row.document_id),
        document_title: row.document_title,
        doc_city: row.doc_city === null ? null : Number(row.doc_city),
        doc_number: row.doc_number,
        doc_expiry_date: row.doc_expiry_date,
        file_url: row.file_url,
        mime_type: row.mime_type,
        file_size: row.file_size === null ? null : Number(row.file_size),
        verified: Number(row.verified || 0),
        status: row.status,
        review_note: row.review_note,
        date_submitted: row.date_submitted,
        updated_at: row.updated_at,
    }));
}

export async function findVehicleSubmissionById(submissionId, conn) {
    const db = dbConnection(conn);
    const [rows] = await db.query(
        `SELECT
            vd.id,
            vd.vehicle_id,
            v.owner_id,
            vd.document_id,
            vd.doc_number,
            vd.doc_expiry_date,
            vd.file_url,
            vd.mime_type,
            vd.file_size,
            vd.verified,
            vd.status,
            vd.review_note,
            vd.date_submitted,
            vd.updated_at
         FROM vehicle_documents vd
         INNER JOIN documents d ON d.id = vd.document_id
         INNER JOIN vehicles v ON v.vehicle_id = vd.vehicle_id
         WHERE vd.id = ? AND d.doc_user = 2 AND d.doc_type = 1
         LIMIT 1`,
        [submissionId]
    );
    const row = rows[0];
    if (!row) return null;
    return {
        id: Number(row.id),
        vehicle_id: Number(row.vehicle_id),
        owner_id: Number(row.owner_id),
        document_id: Number(row.document_id),
        doc_number: row.doc_number,
        doc_expiry_date: row.doc_expiry_date,
        file_url: row.file_url,
        mime_type: row.mime_type,
        file_size: row.file_size === null ? null : Number(row.file_size),
        verified: Number(row.verified || 0),
        status: row.status,
        review_note: row.review_note,
        date_submitted: row.date_submitted,
        updated_at: row.updated_at,
    };
}

export async function updateVehicleSubmissionReview({ submissionId, verified, status, reviewNote }, conn) {
    const db = dbConnection(conn);
    await db.query(
        `UPDATE vehicle_documents
         SET verified = ?, status = ?, review_note = ?, updated_at = NOW()
         WHERE id = ?
         LIMIT 1`,
        [verified, status, reviewNote, submissionId]
    );
}
