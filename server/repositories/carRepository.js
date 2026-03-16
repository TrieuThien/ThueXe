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
    };
}

export async function createRide(payload) {
    const [result] = await sqldb.query(
        `INSERT INTO rides (ride_type, ride_desc, ride_img, num_seats, icon_type, avail)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            payload.ride_type,
            payload.ride_desc,
            payload.ride_img,
            payload.num_seats,
            payload.icon_type,
            payload.avail,
        ]
    );

    return Number(result.insertId);
}

export async function findAllRides() {
    const [rows] = await sqldb.query(
        `SELECT id, ride_type, ride_desc, ride_img, num_seats, icon_type, avail
         FROM rides
         ORDER BY id DESC`
    );

    return rows.map(mapRide);
}

export async function findRideById(id) {
    const [rows] = await sqldb.query(
        `SELECT id, ride_type, ride_desc, ride_img, num_seats, icon_type, avail
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
         SET ride_type = ?, ride_desc = ?, ride_img = ?, num_seats = ?, icon_type = ?, avail = ?
         WHERE id = ?`,
        [
            payload.ride_type,
            payload.ride_desc,
            payload.ride_img,
            payload.num_seats,
            payload.icon_type,
            payload.avail,
            id,
        ]
    );

    return result.affectedRows > 0;
}
