import sqldb from "../config/sqldatabase.js";

function dbConnection(conn) {
    return conn || sqldb;
}

function mapCurrency(row) {
    return {
        id: Number(row.id),
        name: row.name,
        iso_code: row.iso_code,
        symbol: row.symbol,
        exchng_rate: Number(row.exchng_rate || 0),
        default: Number(row.default || 0),
    };
}

function mapRide(row) {
    return {
        id: Number(row.id),
        ride_type: row.ride_type,
        ride_desc: row.ride_desc,
        ride_img: row.ride_img,
        num_seats: Number(row.num_seats || 0),
        icon_type: Number(row.icon_type || 0),
        avail: Number(row.avail || 0),
    };
}

function mapRouteTariffRow(row) {
    return {
        id: Number(row.id),
        r_title: row.r_title,
        r_scope: Number(row.r_scope || 0),
        dist_unit: Number(row.dist_unit || 0),
        city_currency_id: Number(row.city_currency_id || 0),
        currency_name: row.currency_name,
        currency_code: row.currency_code,
        currency_symbol: row.currency_symbol,
        vehicle_count: Number(row.vehicle_count || 0),
    };
}

function mapRouteDetail(row) {
    if (!row) return null;

    return {
        id: Number(row.id),
        r_title: row.r_title,
        c_name: row.c_name,
        pickup_city_id: Number(row.pickup_city_id || 0),
        pick_name: row.pick_name,
        drop_name: row.drop_name,
        r_scope: Number(row.r_scope || 0),
        lng: row.lng,
        lat: row.lat,
        pick_lng: row.pick_lng,
        pick_lat: row.pick_lat,
        drop_lng: row.drop_lng,
        drop_lat: row.drop_lat,
        city_bound_coords: row.city_bound_coords,
        dist_unit: Number(row.dist_unit || 0),
        city_radius: Number(row.city_radius || 0),
        city_currency_id: Number(row.city_currency_id || 0),
        currency_name: row.currency_name,
        currency_code: row.currency_code,
        currency_symbol: row.currency_symbol,
    };
}

function mapTariffDetail(row) {
    return {
        id: Number(row.id),
        ride_id: Number(row.ride_id),
        routes_id: Number(row.routes_id),
        cost_per_km: Number(row.cost_per_km || 0),
        cost_per_minute: Number(row.cost_per_minute || 0),
        wait_time: Number(row.wait_time || 0),
        wait_cost_per_minute: Number(row.wait_cost_per_minute || 0),
        pickup_cost: Number(row.pickup_cost || 0),
        drop_off_cost: Number(row.drop_off_cost || 0),
        cancel_cost: Number(row.cancel_cost || 0),
        init_distance: Number(row.init_distance || 0),
        init_distance_n: Number(row.init_distance_n || 0),
        ncost_per_km: Number(row.ncost_per_km || 0),
        ncost_per_minute: Number(row.ncost_per_minute || 0),
        nwait_time: Number(row.nwait_time || 0),
        nwait_cost_per_minute: Number(row.nwait_cost_per_minute || 0),
        npickup_cost: Number(row.npickup_cost || 0),
        ndrop_off_cost: Number(row.ndrop_off_cost || 0),
        ncancel_cost: Number(row.ncancel_cost || 0),
        cfare_enabled: Number(row.cfare_enabled || 0),
        rshare_enabled: Number(row.rshare_enabled || 0),
        hr_enabled: Number(row.hr_enabled || 0),
        hr_cph: Number(row.hr_cph || 0),
        hr_dist: Number(row.hr_dist || 0),
        nhr_cph: Number(row.nhr_cph || 0),
        nhr_dist: Number(row.nhr_dist || 0),
        pp_enabled: Number(row.pp_enabled || 0),
        pp_start: row.pp_start === null ? null : Number(row.pp_start),
        pp_end: row.pp_end === null ? null : Number(row.pp_end),
        pp_active_days: row.pp_active_days,
        pp_charge_type: Number(row.pp_charge_type || 0),
        pp_charge_value: Number(row.pp_charge_value || 0),
        alt_cars: row.alt_cars,
        ride_type: row.ride_type,
        ride_desc: row.ride_desc,
        ride_img: row.ride_img,
        num_seats: Number(row.num_seats || 0),
        ride_avail: Number(row.ride_avail || 0),
    };
}

function mapZoneRow(row) {
    return {
        id: Number(row.id),
        title: row.title,
        city_id: Number(row.city_id),
        city_route_title: row.city_route_title,
        zone_fare_type: Number(row.zone_fare_type || 0),
        zone_fare_value: Number(row.zone_fare_value || 0),
        zone_bound_coords: row.zone_bound_coords,
        zone_create_date: row.zone_create_date,
    };
}

export async function findActiveRides() {
    const [rows] = await sqldb.query(
        `SELECT id, ride_type, ride_desc, ride_img, num_seats, icon_type, avail
         FROM rides
         WHERE avail = 1
         ORDER BY id ASC`
    );

    return rows.map(mapRide);
}

export async function findCurrencies() {
    const [rows] = await sqldb.query(
        "SELECT id, name, iso_code, symbol, exchng_rate, `default` AS `default` FROM currencies ORDER BY `default` DESC, id ASC"
    );

    return rows.map(mapCurrency);
}

export async function findCityRoutes() {
    const [rows] = await sqldb.query(
        `SELECT id, r_title, c_name, lng, lat
         FROM routes
         WHERE r_scope = 0
         ORDER BY r_title ASC`
    );

    return rows.map((row) => ({
        id: Number(row.id),
        r_title: row.r_title,
        c_name: row.c_name,
        lng: row.lng,
        lat: row.lat,
    }));
}

export async function findTariffRoutes(filters) {
    const whereClauses = [];
    const params = [];

    if (filters.search) {
        whereClauses.push("r.r_title LIKE ?");
        params.push(`%${filters.search}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await sqldb.query(
        `SELECT
            r.id,
            r.r_title,
            r.r_scope,
            r.dist_unit,
            r.city_currency_id,
            c.name AS currency_name,
            c.iso_code AS currency_code,
            c.symbol AS currency_symbol,
            COUNT(DISTINCT rt.ride_id) AS vehicle_count
         FROM routes r
         LEFT JOIN currencies c ON c.id = r.city_currency_id
         LEFT JOIN rides_tariffs rt ON rt.routes_id = r.id
         ${whereSql}
         GROUP BY r.id, r.r_title, r.r_scope, r.dist_unit, r.city_currency_id, c.name, c.iso_code, c.symbol
         ORDER BY r.id DESC
         LIMIT ? OFFSET ?`,
        [...params, filters.limit, offset]
    );

    return rows.map(mapRouteTariffRow);
}

export async function countTariffRoutes(filters) {
    const whereClauses = [];
    const params = [];

    if (filters.search) {
        whereClauses.push("r_title LIKE ?");
        params.push(`%${filters.search}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items FROM routes ${whereSql}`,
        params
    );

    return Number(rows[0]?.total_items || 0);
}

export async function findRouteById(routeId) {
    const [rows] = await sqldb.query(
        `SELECT
            r.id,
            r.r_title,
            r.c_name,
            r.pickup_city_id,
            r.pick_name,
            r.drop_name,
            r.r_scope,
            r.lng,
            r.lat,
            r.pick_lng,
            r.pick_lat,
            r.drop_lng,
            r.drop_lat,
            r.city_bound_coords,
            r.dist_unit,
            r.city_radius,
            r.city_currency_id,
            c.name AS currency_name,
            c.iso_code AS currency_code,
            c.symbol AS currency_symbol
         FROM routes r
         LEFT JOIN currencies c ON c.id = r.city_currency_id
         WHERE r.id = ?
         LIMIT 1`,
        [routeId]
    );

    return mapRouteDetail(rows[0]);
}

export async function findTariffsByRouteId(routeId) {
    const [rows] = await sqldb.query(
        `SELECT
            rt.id,
            rt.ride_id,
            rt.routes_id,
            rt.cost_per_km,
            rt.cost_per_minute,
            rt.wait_time,
            rt.wait_cost_per_minute,
            rt.pickup_cost,
            rt.drop_off_cost,
            rt.cancel_cost,
            rt.init_distance,
            rt.init_distance_n,
            rt.ncost_per_km,
            rt.ncost_per_minute,
            rt.nwait_time,
            rt.nwait_cost_per_minute,
            rt.npickup_cost,
            rt.ndrop_off_cost,
            rt.ncancel_cost,
            rt.cfare_enabled,
            rt.rshare_enabled,
            rt.hr_enabled,
            rt.hr_cph,
            rt.hr_dist,
            rt.nhr_cph,
            rt.nhr_dist,
            rt.pp_enabled,
            rt.pp_start,
            rt.pp_end,
            rt.pp_active_days,
            rt.pp_charge_type,
            rt.pp_charge_value,
            rt.alt_cars,
            rd.ride_type,
            rd.ride_desc,
            rd.ride_img,
            rd.num_seats,
            rd.avail AS ride_avail
         FROM rides_tariffs rt
         LEFT JOIN rides rd ON rd.id = rt.ride_id
         WHERE rt.routes_id = ?
         ORDER BY rt.id ASC`,
        [routeId]
    );

    return rows.map(mapTariffDetail);
}

export async function routeTitleExists(rTitle, excludeRouteId = null) {
    const query = excludeRouteId
        ? `SELECT id FROM routes WHERE LOWER(TRIM(r_title)) = LOWER(TRIM(?)) AND id <> ? LIMIT 1`
        : `SELECT id FROM routes WHERE LOWER(TRIM(r_title)) = LOWER(TRIM(?)) LIMIT 1`;

    const params = excludeRouteId ? [rTitle, excludeRouteId] : [rTitle];
    const [rows] = await sqldb.query(query, params);

    return rows.length > 0;
}

export async function currencyExists(currencyId) {
    const [rows] = await sqldb.query(`SELECT id FROM currencies WHERE id = ? LIMIT 1`, [currencyId]);
    return rows.length > 0;
}

export async function rideExists(rideId) {
    const [rows] = await sqldb.query(`SELECT id FROM rides WHERE id = ? LIMIT 1`, [rideId]);
    return rows.length > 0;
}

export async function insertRoute(payload, conn) {
    const db = dbConnection(conn);

    const [result] = await db.query(
        `INSERT INTO routes (
            r_title,
            c_name,
            pickup_city_id,
            pick_name,
            drop_name,
            r_scope,
            lng,
            lat,
            pick_lng,
            pick_lat,
            drop_lng,
            drop_lat,
            city_bound_coords,
            dist_unit,
            city_radius,
            city_currency_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.r_title,
            payload.c_name,
            payload.pickup_city_id,
            payload.pick_name,
            payload.drop_name,
            payload.r_scope,
            payload.lng,
            payload.lat,
            payload.pick_lng,
            payload.pick_lat,
            payload.drop_lng,
            payload.drop_lat,
            payload.city_bound_coords,
            payload.dist_unit,
            payload.city_radius,
            payload.city_currency_id,
        ]
    );

    return Number(result.insertId);
}

export async function updateRoute(routeId, payload, conn) {
    const db = dbConnection(conn);

    const [result] = await db.query(
        `UPDATE routes
         SET
            r_title = ?,
            c_name = ?,
            pickup_city_id = ?,
            pick_name = ?,
            drop_name = ?,
            r_scope = ?,
            lng = ?,
            lat = ?,
            pick_lng = ?,
            pick_lat = ?,
            drop_lng = ?,
            drop_lat = ?,
            city_bound_coords = ?,
            dist_unit = ?,
            city_radius = ?,
            city_currency_id = ?
         WHERE id = ?
         LIMIT 1`,
        [
            payload.r_title,
            payload.c_name,
            payload.pickup_city_id,
            payload.pick_name,
            payload.drop_name,
            payload.r_scope,
            payload.lng,
            payload.lat,
            payload.pick_lng,
            payload.pick_lat,
            payload.drop_lng,
            payload.drop_lat,
            payload.city_bound_coords,
            payload.dist_unit,
            payload.city_radius,
            payload.city_currency_id,
            routeId,
        ]
    );

    return result.affectedRows > 0;
}

export async function insertRideTariff(payload, conn) {
    const db = dbConnection(conn);

    const [result] = await db.query(
        `INSERT INTO rides_tariffs (
            ride_id,
            routes_id,
            cost_per_km,
            cost_per_minute,
            wait_time,
            wait_cost_per_minute,
            pickup_cost,
            drop_off_cost,
            cancel_cost,
            init_distance,
            init_distance_n,
            ncost_per_km,
            ncost_per_minute,
            nwait_time,
            nwait_cost_per_minute,
            npickup_cost,
            ndrop_off_cost,
            ncancel_cost,
            cfare_enabled,
            rshare_enabled,
            hr_enabled,
            hr_cph,
            hr_dist,
            nhr_cph,
            nhr_dist,
            pp_enabled,
            pp_start,
            pp_end,
            pp_active_days,
            pp_charge_type,
            pp_charge_value,
            alt_cars
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.ride_id,
            payload.routes_id,
            payload.cost_per_km,
            payload.cost_per_minute,
            payload.wait_time,
            payload.wait_cost_per_minute,
            payload.pickup_cost,
            payload.drop_off_cost,
            payload.cancel_cost,
            payload.init_distance,
            payload.init_distance_n,
            payload.ncost_per_km,
            payload.ncost_per_minute,
            payload.nwait_time,
            payload.nwait_cost_per_minute,
            payload.npickup_cost,
            payload.ndrop_off_cost,
            payload.ncancel_cost,
            payload.cfare_enabled,
            payload.rshare_enabled,
            payload.hr_enabled,
            payload.hr_cph,
            payload.hr_dist,
            payload.nhr_cph,
            payload.nhr_dist,
            payload.pp_enabled,
            payload.pp_start,
            payload.pp_end,
            payload.pp_active_days,
            payload.pp_charge_type,
            payload.pp_charge_value,
            payload.alt_cars,
        ]
    );

    return Number(result.insertId);
}

export async function updateRideTariffById(tariffId, payload, conn) {
    const db = dbConnection(conn);

    const [result] = await db.query(
        `UPDATE rides_tariffs
         SET
            ride_id = ?,
            cost_per_km = ?,
            cost_per_minute = ?,
            wait_time = ?,
            wait_cost_per_minute = ?,
            pickup_cost = ?,
            drop_off_cost = ?,
            cancel_cost = ?,
            init_distance = ?,
            init_distance_n = ?,
            ncost_per_km = ?,
            ncost_per_minute = ?,
            nwait_time = ?,
            nwait_cost_per_minute = ?,
            npickup_cost = ?,
            ndrop_off_cost = ?,
            ncancel_cost = ?,
            cfare_enabled = ?,
            rshare_enabled = ?,
            hr_enabled = ?,
            hr_cph = ?,
            hr_dist = ?,
            nhr_cph = ?,
            nhr_dist = ?,
            pp_enabled = ?,
            pp_start = ?,
            pp_end = ?,
            pp_active_days = ?,
            pp_charge_type = ?,
            pp_charge_value = ?,
            alt_cars = ?
         WHERE id = ?
         LIMIT 1`,
        [
            payload.ride_id,
            payload.cost_per_km,
            payload.cost_per_minute,
            payload.wait_time,
            payload.wait_cost_per_minute,
            payload.pickup_cost,
            payload.drop_off_cost,
            payload.cancel_cost,
            payload.init_distance,
            payload.init_distance_n,
            payload.ncost_per_km,
            payload.ncost_per_minute,
            payload.nwait_time,
            payload.nwait_cost_per_minute,
            payload.npickup_cost,
            payload.ndrop_off_cost,
            payload.ncancel_cost,
            payload.cfare_enabled,
            payload.rshare_enabled,
            payload.hr_enabled,
            payload.hr_cph,
            payload.hr_dist,
            payload.nhr_cph,
            payload.nhr_dist,
            payload.pp_enabled,
            payload.pp_start,
            payload.pp_end,
            payload.pp_active_days,
            payload.pp_charge_type,
            payload.pp_charge_value,
            payload.alt_cars,
            tariffId,
        ]
    );

    return result.affectedRows > 0;
}

export async function findZoneList(filters) {
    const whereClauses = [];
    const params = [];

    if (filters.search) {
        whereClauses.push("z.title LIKE ?");
        params.push(`%${filters.search}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await sqldb.query(
        `SELECT
            z.id,
            z.title,
            z.city_id,
            z.zone_fare_type,
            z.zone_fare_value,
            z.zone_bound_coords,
            z.zone_create_date,
            r.r_title AS city_route_title
         FROM zones z
         LEFT JOIN routes r ON r.id = z.city_id
         ${whereSql}
         ORDER BY z.id DESC
         LIMIT ? OFFSET ?`,
        [...params, filters.limit, offset]
    );

    return rows.map(mapZoneRow);
}

export async function countZones(filters) {
    const whereClauses = [];
    const params = [];

    if (filters.search) {
        whereClauses.push("title LIKE ?");
        params.push(`%${filters.search}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [rows] = await sqldb.query(
        `SELECT COUNT(*) AS total_items FROM zones ${whereSql}`,
        params
    );

    return Number(rows[0]?.total_items || 0);
}

export async function findZoneById(zoneId) {
    const [rows] = await sqldb.query(
        `SELECT
            z.id,
            z.title,
            z.city_id,
            z.zone_fare_type,
            z.zone_fare_value,
            z.zone_bound_coords,
            z.zone_create_date,
            r.r_title AS city_route_title
         FROM zones z
         LEFT JOIN routes r ON r.id = z.city_id
         WHERE z.id = ?
         LIMIT 1`,
        [zoneId]
    );

    return mapZoneRow(rows[0]);
}

export async function insertZone(payload, conn) {
    const db = dbConnection(conn);

    const [result] = await db.query(
        `INSERT INTO zones (title, city_id, zone_fare_type, zone_fare_value, zone_bound_coords, zone_create_date)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
            payload.title,
            payload.city_id,
            payload.zone_fare_type,
            payload.zone_fare_value,
            payload.zone_bound_coords,
        ]
    );

    return Number(result.insertId);
}

export async function updateZone(zoneId, payload, conn) {
    const db = dbConnection(conn);

    const [result] = await db.query(
        `UPDATE zones
         SET title = ?, city_id = ?, zone_fare_type = ?, zone_fare_value = ?, zone_bound_coords = ?
         WHERE id = ?
         LIMIT 1`,
        [
            payload.title,
            payload.city_id,
            payload.zone_fare_type,
            payload.zone_fare_value,
            payload.zone_bound_coords,
            zoneId,
        ]
    );

    return result.affectedRows > 0;
}

export async function cityRouteExists(routeId) {
    const [rows] = await sqldb.query(
        `SELECT id FROM routes WHERE id = ? AND r_scope = 0 LIMIT 1`,
        [routeId]
    );

    return rows.length > 0;
}

