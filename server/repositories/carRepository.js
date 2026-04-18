import sqldb from "../config/sqldatabase.js";

function mapRide(row) {
    if (!row) {
        return null;
    }

    return {
        id: Number(row.id),
        ride_type: row.ride_type,
        ride_desc: row.ride_desc,
        ride_img: row.ride_img,
        num_seats: Number(row.num_seats),
        icon_type: Number(row.icon_type),
        avail: Number(row.avail),
        provide_rental: Number(row.provide_rental ?? 0),
        rental_type_id: row.rental_type_id ? Number(row.rental_type_id) : null,
    };
}

export async function createRide(payload) {
    const [result] = await sqldb.query(
        `INSERT INTO rides (ride_type, ride_desc, ride_img, num_seats, icon_type, avail, provide_rental, rental_type_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.ride_type,
            payload.ride_desc,
            payload.ride_img,
            payload.num_seats,
            payload.icon_type,
            payload.avail,
            payload.provide_rental ?? 0,
            payload.rental_type_id ?? null,
        ]
    );

    return Number(result.insertId);
}

export async function findAllRides() {
    const [rows] = await sqldb.query(
        `SELECT id, ride_type, ride_desc, ride_img, num_seats, icon_type, avail, provide_rental, rental_type_id
         FROM rides
         ORDER BY id DESC`
    );

    return rows.map(mapRide);
}

export async function findRideById(id) {
    const [rows] = await sqldb.query(
        `SELECT id, ride_type, ride_desc, ride_img, num_seats, icon_type, avail, provide_rental, rental_type_id
         FROM rides
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return mapRide(rows[0]);
}

export async function updateRideById(id, payload) {
    const [result] = await sqldb.query(
        `UPDATE rides
         SET ride_type = ?, ride_desc = ?, ride_img = ?, num_seats = ?, icon_type = ?, avail = ?,
             provide_rental = ?, rental_type_id = ?
         WHERE id = ?`,
        [
            payload.ride_type,
            payload.ride_desc,
            payload.ride_img,
            payload.num_seats,
            payload.icon_type,
            payload.avail,
            payload.provide_rental ?? 0,
            payload.rental_type_id ?? null,
            id,
        ]
    );

    return result.affectedRows > 0;
}

// --- vehicle_types helpers (for rental service sync) ---

export async function createVehicleType(payload) {
    const [result] = await sqldb.query(
        `INSERT INTO vehicle_types (type_name, description, seat_count, active)
         VALUES (?, ?, ?, 1)`,
        [payload.type_name, payload.description, payload.seat_count]
    );
    return Number(result.insertId);
}

export async function updateVehicleTypeById(typeId, payload) {
    await sqldb.query(
        `UPDATE vehicle_types
         SET type_name = ?, description = ?, seat_count = ?, active = ?
         WHERE type_id = ?`,
        [payload.type_name, payload.description, payload.seat_count, payload.active ?? 1, typeId]
    );
}
