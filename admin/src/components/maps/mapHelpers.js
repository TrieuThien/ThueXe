export function hasValidCoordinateValue(value) {
    if (value === undefined || value === null) return false;
    const normalized = String(value).trim();
    if (!normalized) return false;
    const parsed = Number(normalized);
    return Number.isFinite(parsed);
}

export function normalizeLatLng(value) {
    if (!value || typeof value !== "object") return null;
    const lat = Number(value.lat);
    const lng = Number(value.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

export function clearMapObjectListeners(target) {
    if (!target || !window.google?.maps?.event?.clearInstanceListeners) return;
    window.google.maps.event.clearInstanceListeners(target);
}

export function detachMapObject(target) {
    if (!target) return;
    if (typeof target.setMap === "function") {
        target.setMap(null);
        return;
    }
    if ("map" in target) {
        target.map = null;
    }
}

export function parseDurationSeconds(route) {
    if (!route || typeof route !== "object") return null;
    const durationMillis = Number(route.durationMillis);
    if (Number.isFinite(durationMillis)) {
        return Math.round(durationMillis / 1000);
    }

    if (typeof route.duration === "string") {
        const match = route.duration.match(/^(\d+(?:\.\d+)?)s$/i);
        if (match) return Math.round(Number(match[1]));
    }

    return null;
}

export function durationToText(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.max(1, Math.round((seconds % 3600) / 60));
    if (hours <= 0) return `${minutes} phut`;
    return `${hours} gio ${minutes} phut`;
}

export function createBoundsFromPath(path = []) {
    if (!window.google?.maps?.LatLngBounds || !Array.isArray(path) || path.length === 0) {
        return null;
    }

    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((point) => {
        const normalized = normalizeLatLng({
            lat: typeof point?.lat === "function" ? point.lat() : point?.lat,
            lng: typeof point?.lng === "function" ? point.lng() : point?.lng,
        });
        if (normalized) bounds.extend(normalized);
    });

    return bounds;
}
