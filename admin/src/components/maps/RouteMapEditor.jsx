import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPinned } from "lucide-react";
import { loadGoogleMaps } from "./googleMapsLoader";

const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };
const DEFAULT_ZOOM = 11;

function parseCoordinateValue(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function parsePolygonValue(value) {
    if (!value) return [];

    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        const coords = Array.isArray(parsed?.coords) ? parsed.coords : [];

        return coords
            .map((point) => ({
                lat: Number(point?.lat),
                lng: Number(point?.lng),
            }))
            .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    } catch {
        return [];
    }
}

function polygonToPayload(path, centerMarker = null) {
    const toLatLng = (point) => {
        const lat =
            typeof point?.lat === "function" ? Number(point.lat()) : Number(point?.lat);
        const lng =
            typeof point?.lng === "function" ? Number(point.lng()) : Number(point?.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
        }

        return { lat, lng };
    };

    const coords = path.map(toLatLng).filter(Boolean);

    if (!coords.length) return "";

    const center = centerMarker
        ? {
              lat: Number(centerMarker.getPosition()?.lat()),
              lng: Number(centerMarker.getPosition()?.lng()),
          }
        : undefined;

    return JSON.stringify({ coords, center });
}

export default function RouteMapEditor({ scope, value, onChange, className = "" }) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
    const mapId = import.meta.env.VITE_GOOGLE_MAP_ID?.trim() || "";

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const polygonRef = useRef(null);
    const centerMarkerRef = useRef(null);
    const pickupMarkerRef = useRef(null);
    const dropMarkerRef = useRef(null);
    const activeClickTargetRef = useRef("center");

    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    const scopeRef = useRef(scope);
    const cityDrawModeRef = useRef(false);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [cityDrawMode, setCityDrawMode] = useState(false);

    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        scopeRef.current = scope;
    }, [scope]);

    useEffect(() => {
        cityDrawModeRef.current = cityDrawMode;
    }, [cityDrawMode]);

    const centerPosition = useMemo(() => {
        const lat = parseCoordinateValue(value?.lat);
        const lng = parseCoordinateValue(value?.lng);

        if (lat === null || lng === null) return DEFAULT_CENTER;
        return { lat, lng };
    }, [value?.lat, value?.lng]);

    function emitChangeIfNeeded(field, nextValue) {
        const currentValue = valueRef.current?.[field];
        const normalizedCurrent =
            currentValue === undefined || currentValue === null ? "" : String(currentValue);
        const normalizedNext =
            nextValue === undefined || nextValue === null ? "" : String(nextValue);

        if (normalizedCurrent === normalizedNext) return;
        onChangeRef.current(field, nextValue);
    }

    function syncPolygonPayload() {
        if (!polygonRef.current) {
            emitChangeIfNeeded("city_bound_coords", "");
            return;
        }

        const payload = polygonToPayload(
            polygonRef.current.getPath().getArray(),
            centerMarkerRef.current
        );
        emitChangeIfNeeded("city_bound_coords", payload);
    }

    function attachPolygonListeners(polygon) {
        const path = polygon.getPath();
        path.addListener("insert_at", syncPolygonPayload);
        path.addListener("set_at", syncPolygonPayload);
        path.addListener("remove_at", syncPolygonPayload);
    }

    function resetPolygon(newPath = [], { emitPayload = true } = {}) {
        if (!window.google?.maps || !mapRef.current) return;

        if (polygonRef.current) {
            polygonRef.current.setMap(null);
            polygonRef.current = null;
        }

        if (!newPath.length) {
            if (emitPayload) {
                emitChangeIfNeeded("city_bound_coords", "");
            }
            return;
        }

        const polygon = new window.google.maps.Polygon({
            map: mapRef.current,
            paths: newPath,
            editable: true,
            draggable: false,
            fillColor: "#2563eb",
            fillOpacity: 0.16,
            strokeColor: "#1d4ed8",
            strokeWeight: 2,
        });

        polygonRef.current = polygon;
        attachPolygonListeners(polygon);
        if (emitPayload) {
            syncPolygonPayload();
        }
    }

    function addPointToPolygon(point) {
        if (!window.google?.maps || !mapRef.current) return;

        if (!polygonRef.current) {
            resetPolygon([point], { emitPayload: false });
        } else {
            polygonRef.current.getPath().push(point);
        }

        syncPolygonPayload();
    }

    function clearCityPolygon() {
        resetPolygon([], { emitPayload: true });
    }

    function ensureMarker(ref, position, title, fieldLat, fieldLng) {
        if (!window.google?.maps || !mapRef.current) return;

        if (!ref.current) {
            ref.current = new window.google.maps.Marker({
                map: mapRef.current,
                position,
                title,
                draggable: true,
            });

            ref.current.addListener("dragend", () => {
                const markerPosition = ref.current.getPosition();
                emitChangeIfNeeded(fieldLat, String(markerPosition.lat()));
                emitChangeIfNeeded(fieldLng, String(markerPosition.lng()));
                if (scopeRef.current === "city" && ref === centerMarkerRef) {
                    syncPolygonPayload();
                }
            });
        } else {
            ref.current.setMap(mapRef.current);
            ref.current.setPosition(position);
        }
    }

    useEffect(() => {
        if (!apiKey || !mapContainerRef.current || mapRef.current) return;

        setLoading(true);
        setErrorMessage("");

        loadGoogleMaps({ apiKey })
            .then(() => {
                const buildMap = (resolvedMapId) =>
                    new window.google.maps.Map(mapContainerRef.current, {
                        center: DEFAULT_CENTER,
                        zoom: DEFAULT_ZOOM,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                        mapId: resolvedMapId,
                        gestureHandling: "greedy",
                    });

                mapRef.current = mapId ? buildMap(mapId) : buildMap(undefined);

                mapRef.current.addListener("click", (event) => {
                    const point = {
                        lat: event.latLng.lat(),
                        lng: event.latLng.lng(),
                    };

                    if (scopeRef.current === "city") {
                        if (cityDrawModeRef.current) {
                            addPointToPolygon(point);
                            return;
                        }

                        ensureMarker(centerMarkerRef, point, "Tâm thành phố", "lat", "lng");
                        emitChangeIfNeeded("lat", String(point.lat));
                        emitChangeIfNeeded("lng", String(point.lng));
                        syncPolygonPayload();
                        return;
                    }

                    if (activeClickTargetRef.current === "pickup") {
                        ensureMarker(pickupMarkerRef, point, "Điểm đón", "pick_lat", "pick_lng");
                        emitChangeIfNeeded("pick_lat", String(point.lat));
                        emitChangeIfNeeded("pick_lng", String(point.lng));
                        return;
                    }

                    ensureMarker(dropMarkerRef, point, "Điểm trả", "drop_lat", "drop_lng");
                    emitChangeIfNeeded("drop_lat", String(point.lat));
                    emitChangeIfNeeded("drop_lng", String(point.lng));
                });
            })
            .catch((error) => {
                setErrorMessage(error?.message || "Không thể khởi tạo Google Maps.");
            })
            .finally(() => setLoading(false));
    }, [apiKey, mapId]);

    useEffect(() => {
        if (!mapRef.current || !window.google?.maps) return;

        if (scope === "city") {
            ensureMarker(centerMarkerRef, centerPosition, "Tâm thành phố", "lat", "lng");

            if (pickupMarkerRef.current) pickupMarkerRef.current.setMap(null);
            if (dropMarkerRef.current) dropMarkerRef.current.setMap(null);

            const polygonPath = parsePolygonValue(value?.city_bound_coords);
            resetPolygon(polygonPath, { emitPayload: false });

            mapRef.current.panTo(centerPosition);
            mapRef.current.setZoom(12);
        } else {
            setCityDrawMode(false);

            if (polygonRef.current) {
                polygonRef.current.setMap(null);
                polygonRef.current = null;
            }
            if (centerMarkerRef.current) centerMarkerRef.current.setMap(null);

            const pickLat = parseCoordinateValue(value?.pick_lat);
            const pickLng = parseCoordinateValue(value?.pick_lng);
            const dropLat = parseCoordinateValue(value?.drop_lat);
            const dropLng = parseCoordinateValue(value?.drop_lng);

            if (pickLat !== null && pickLng !== null) {
                ensureMarker(
                    pickupMarkerRef,
                    { lat: pickLat, lng: pickLng },
                    "Điểm đón",
                    "pick_lat",
                    "pick_lng"
                );
            }

            if (dropLat !== null && dropLng !== null) {
                ensureMarker(
                    dropMarkerRef,
                    { lat: dropLat, lng: dropLng },
                    "Điểm trả",
                    "drop_lat",
                    "drop_lng"
                );
            }

            const focus =
                pickLat !== null && pickLng !== null
                    ? { lat: pickLat, lng: pickLng }
                    : dropLat !== null && dropLng !== null
                    ? { lat: dropLat, lng: dropLng }
                    : centerPosition;

            mapRef.current.panTo(focus);
            mapRef.current.setZoom(11);
        }
    }, [
        centerPosition,
        scope,
        value?.city_bound_coords,
        value?.pick_lat,
        value?.pick_lng,
        value?.drop_lat,
        value?.drop_lng,
    ]);

    return (
        <div className={`rounded-3xl border border-slate-200 bg-white p-4 ${className}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <MapPinned className="h-4 w-4 text-blue-600" />
                    Bản đồ cấu hình tuyến
                </h3>
                {scope === "state" ? (
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => {
                                activeClickTargetRef.current = "pickup";
                            }}
                            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700"
                        >
                            Chọn điểm đón
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                activeClickTargetRef.current = "drop";
                            }}
                            className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 font-semibold text-amber-700"
                        >
                            Chọn điểm trả
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => setCityDrawMode((prev) => !prev)}
                            className={`rounded-xl border px-3 py-1.5 font-semibold ${
                                cityDrawMode
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-blue-300 bg-blue-50 text-blue-700"
                            }`}
                        >
                            {cityDrawMode ? "Đang vẽ polygon" : "Bắt đầu vẽ polygon"}
                        </button>
                        <button
                            type="button"
                            onClick={clearCityPolygon}
                            className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700"
                        >
                            Xóa polygon
                        </button>
                    </div>
                )}
            </div>

            <div className="relative h-[360px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <div ref={mapContainerRef} className="h-full w-full" />

                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm text-slate-700">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tải Google Maps...
                    </div>
                ) : null}
            </div>

            {scope === "city" ? (
                <p className="mt-2 text-xs text-slate-500">
                    Bật chế độ vẽ polygon rồi nhấn lên bản đồ để thêm điểm. Khi tắt chế độ vẽ, nhấn bản đồ để đặt tâm thành phố.
                </p>
            ) : null}

            {!apiKey ? (
                <p className="mt-3 text-sm text-red-600">Thiếu VITE_GOOGLE_MAPS_API_KEY để hiển thị bản đồ.</p>
            ) : null}
            {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
        </div>
    );
}
