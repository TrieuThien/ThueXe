/**
 * locationUtils.js
 * GIS helper functions dùng để kiểm tra vị trí người dùng có nằm
 * trong khu vực áp dụng của gói thuê hay không, cũng như tìm tài xế
 * gần nhất cho luồng thuê tài xế tức thì.
 *
 * Phần thuần JS (không phụ thuộc DB) ở trên.
 * Phần DB query (findNearbyDrivers) ở dưới — import sqldb khi cần.
 */
import sqldb from "../config/sqldatabase.js";

/** Chuyển độ sang radian */
function toRad(deg) {
    return (deg * Math.PI) / 180;
}

/**
 * Tính khoảng cách giữa hai tọa độ bằng công thức Haversine.
 * @returns {number} Khoảng cách (km)
 */
export function getDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // bán kính Trái Đất (km)
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Kiểm tra điểm (lat, lng) có nằm trong đa giác không (Ray-Casting Algorithm).
 * @param {number} lat - vĩ độ điểm cần kiểm tra
 * @param {number} lng - kinh độ điểm cần kiểm tra
 * @param {Array<[number, number]>} polygon - mảng [lat, lng] của các đỉnh đa giác
 * @returns {boolean}
 */
export function isPointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [lat_i, lng_i] = polygon[i];
        const [lat_j, lng_j] = polygon[j];
        // Tia ngang từ điểm test sang phải; đếm số giao điểm với cạnh đa giác
        const intersect =
            (lat_i > lat) !== (lat_j > lat) &&
            lng < ((lng_j - lng_i) * (lat - lat_i)) / (lat_j - lat_i) + lng_i;
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Kiểm tra điểm có nằm trong hình tròn không.
 * @param {number} lat
 * @param {number} lng
 * @param {number} centerLat - vĩ độ tâm
 * @param {number} centerLng - kinh độ tâm
 * @param {number} radiusKm  - bán kính (km)
 * @returns {boolean}
 */
export function isPointInCircle(lat, lng, centerLat, centerLng, radiusKm) {
    return getDistanceKm(lat, lng, centerLat, centerLng) <= radiusKm;
}

/**
 * Kiểm tra điểm có nằm trong hình chữ nhật không.
 * GeoJSON rectangle: coordinates[0] có dạng 5 điểm khép kín [lng, lat].
 * Hàm tự tính bounding-box min/max.
 * @param {number} lat
 * @param {number} lng
 * @param {object} geojson - GeoJSON Polygon object
 * @returns {boolean}
 */
export function isPointInRectangle(lat, lng, geojson) {
    const coords = geojson?.coordinates?.[0];
    if (!coords || coords.length < 4) return false;
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Kiểm tra tổng quát: điểm (lat, lng) có nằm trong vùng phủ của gói thuê không.
 * Nếu gói chưa cấu hình vùng hoặc is_geo_enabled=0 → trả về true (không giới hạn).
 *
 * @param {number} lat
 * @param {number} lng
 * @param {object} pkg - bản ghi rental_package có các trường GIS
 * @returns {boolean}
 */
export function isPointInCoverage(lat, lng, pkg) {
    // Không bật giới hạn vùng → gói áp dụng toàn quốc
    if (!pkg.is_geo_enabled || !pkg.coverage_type) return true;

    if (pkg.coverage_type === 'circle') {
        if (pkg.center_lat == null || pkg.center_lng == null || pkg.radius_km == null) return true;
        return isPointInCircle(lat, lng, Number(pkg.center_lat), Number(pkg.center_lng), Number(pkg.radius_km));
    }

    // polygon hoặc rectangle đều dùng GeoJSON
    const geojson =
        typeof pkg.coverage_geojson === 'string'
            ? (() => {
                  try { return JSON.parse(pkg.coverage_geojson); } catch { return null; }
              })()
            : pkg.coverage_geojson;

    if (!geojson?.coordinates?.[0]) return true;

    if (pkg.coverage_type === 'rectangle') {
        return isPointInRectangle(lat, lng, geojson);
    }

    // polygon: GeoJSON dùng [lng, lat] → chuyển sang [lat, lng] cho thuật toán
    const polygon = geojson.coordinates[0].map((c) => [c[1], c[0]]);
    return isPointInPolygon(lat, lng, polygon);
}

// ─── Driver matching helpers ──────────────────────────────────────────────────

/**
 * Tìm tài xế khả dụng gần vị trí (lat, lng) trong bán kính radiusKm.
 *
 * Điều kiện:
 *  - account_active=1, is_activated=1, account_deleted=0
 *  - available=1 (online), operation_status=0 (không bận)
 *  - available_for_rental=1
 *  - GPS cập nhật trong 5 phút gần nhất
 *  - Nếu truyền packageId: phải có đăng ký gói đó (driver_rental_packages)
 *  - Không đang có booking pending/in_progress (service_type 2 hoặc 3)
 *  - Không nằm trong excludeIds (đã từ chối/timeout rồi)
 *
 * Kết quả sắp xếp: gần nhất → rating cao → ít hủy nhất.
 *
 * @param {number}   lat
 * @param {number}   lng
 * @param {number}   radiusKm
 * @param {number|null} packageId
 * @param {number[]} excludeIds
 * @returns {Promise<Array>}
 */
export async function findNearbyDrivers(lat, lng, radiusKm = 2, packageId = null, excludeIds = []) {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    const STALE_MINUTES = 5;

    const params = [];

    let packageJoin = "";
    if (packageId) {
        packageJoin = `INNER JOIN driver_rental_packages drp
                          ON drp.driver_id = d.driver_id
                         AND drp.package_id = ?
                         AND drp.status = 'active'`;
        params.push(packageId);
    }

    // ACOS params
    params.push(lat, lng, lat);
    // bounding box
    params.push(minLat, maxLat, minLng, maxLng);
    // stale threshold
    params.push(STALE_MINUTES);
    // excludeIds
    if (excludeIds.length > 0) params.push(...excludeIds);
    // HAVING radius
    params.push(radiusKm);

    const excludeSql =
        excludeIds.length > 0
            ? `AND d.driver_id NOT IN (${excludeIds.map(() => "?").join(",")})`
            : "";

    const [rows] = await sqldb.query(
        `SELECT
             d.driver_id,
             d.firstname,
             d.lastname,
             d.phone,
             d.photo_file,
             d.driver_rating,
             d.booking_cancel_freq,
             dcl.lat,
             dcl.long AS lng,
             (
                 6371 * ACOS(GREATEST(-1, LEAST(1,
                     COS(RADIANS(?)) * COS(RADIANS(dcl.lat)) *
                     COS(RADIANS(dcl.long) - RADIANS(?)) +
                     SIN(RADIANS(?)) * SIN(RADIANS(dcl.lat))
                 )))
             ) AS distance_km
         FROM drivers d
         INNER JOIN driver_current_locations dcl ON dcl.driver_id = d.driver_id
         ${packageJoin}
         WHERE d.account_active      = 1
           AND d.is_activated        = 1
           AND d.account_deleted     = 0
           AND d.available           = 1
           AND d.operation_status    = 0
           AND d.available_for_rental = 1
           AND dcl.lat  BETWEEN ? AND ?
           AND dcl.long BETWEEN ? AND ?
           AND dcl.updated_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
           ${excludeSql}
           AND NOT EXISTS (
               SELECT 1 FROM rental_bookings rb
               WHERE rb.driver_id = d.driver_id
                 AND rb.status IN ('pending','in_progress')
                 AND rb.service_type IN (2,3)
           )
         HAVING distance_km <= ?
         ORDER BY distance_km ASC, d.driver_rating DESC, d.booking_cancel_freq ASC
         LIMIT 20`,
        params
    );

    return rows.map((row) => ({
        driver_id:           Number(row.driver_id),
        firstname:           row.firstname,
        lastname:            row.lastname,
        phone:               row.phone,
        photo_file:          row.photo_file,
        driver_rating:       Number(row.driver_rating),
        booking_cancel_freq: Number(row.booking_cancel_freq),
        lat:                 Number(row.lat),
        lng:                 Number(row.lng),
        distance_km:         Number(Number(row.distance_km).toFixed(3)),
    }));
}

/**
 * Sắp xếp danh sách tài xế theo ưu tiên (dùng khi cần sort lại sau khi lọc thêm).
 */
export function sortDriversByPriority(drivers) {
    return [...drivers].sort((a, b) => {
        if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
        if (a.driver_rating !== b.driver_rating) return b.driver_rating - a.driver_rating;
        return a.booking_cancel_freq - b.booking_cancel_freq;
    });
}
