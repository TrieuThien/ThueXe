/**
 * locationUtils.js
 * GIS helper functions dùng để kiểm tra vị trí người dùng có nằm
 * trong khu vực áp dụng của gói thuê hay không.
 *
 * Tất cả hàm thuần JS, không phụ thuộc DB hay thư viện ngoài.
 */

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
