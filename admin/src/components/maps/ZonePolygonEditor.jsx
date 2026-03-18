import { useEffect, useRef, useState } from "react";
import { Loader2, MapPinned } from "lucide-react";
import { loadGoogleMaps } from "./googleMapsLoader";

const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };

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

function polygonToPayload(path) {
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

    return coords.length ? JSON.stringify({ coords }) : "";
}

export default function ZonePolygonEditor({ value, onChange }) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
    const mapId = import.meta.env.VITE_GOOGLE_MAP_ID?.trim() || "";

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const polygonRef = useRef(null);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    const drawModeRef = useRef(false);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [drawMode, setDrawMode] = useState(false);

    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        drawModeRef.current = drawMode;
    }, [drawMode]);

    function emitChangeIfNeeded(nextValue) {
        const currentValue = valueRef.current || "";
        const normalizedCurrent = String(currentValue);
        const normalizedNext = String(nextValue || "");

        if (normalizedCurrent === normalizedNext) return;
        onChangeRef.current(nextValue || "");
    }

    function syncPolygonPayload() {
        if (!polygonRef.current) {
            emitChangeIfNeeded("");
            return;
        }

        const payload = polygonToPayload(polygonRef.current.getPath().getArray());
        emitChangeIfNeeded(payload);
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
                emitChangeIfNeeded("");
            }
            return;
        }

        const polygon = new window.google.maps.Polygon({
            map: mapRef.current,
            paths: newPath,
            editable: true,
            fillColor: "#0ea5e9",
            fillOpacity: 0.15,
            strokeColor: "#0284c7",
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

    function clearPolygon() {
        resetPolygon([], { emitPayload: true });
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
                        zoom: 11,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                        mapId: resolvedMapId,
                        gestureHandling: "greedy",
                    });

                mapRef.current = mapId ? buildMap(mapId) : buildMap(undefined);

                mapRef.current.addListener("click", (event) => {
                    if (!drawModeRef.current) {
                        return;
                    }

                    const point = {
                        lat: event.latLng.lat(),
                        lng: event.latLng.lng(),
                    };

                    addPointToPolygon(point);
                });
            })
            .catch((error) => {
                setErrorMessage(error?.message || "Không thể khởi tạo Google Maps.");
            })
            .finally(() => setLoading(false));
    }, [apiKey, mapId]);

    useEffect(() => {
        if (!mapRef.current || !window.google?.maps) return;

        const coords = parsePolygonValue(value);
        resetPolygon(coords, { emitPayload: false });

        if (coords.length) {
            const bounds = new window.google.maps.LatLngBounds();
            coords.forEach((point) => bounds.extend(point));
            mapRef.current.fitBounds(bounds, 30);
        }
    }, [value]);

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <MapPinned className="h-4 w-4 text-cyan-600" />
                    Bản đồ vùng
                </h3>
                <div className="flex items-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => setDrawMode((prev) => !prev)}
                        className={`rounded-xl border px-3 py-1.5 font-semibold ${
                            drawMode
                                ? "border-cyan-600 bg-cyan-600 text-white"
                                : "border-cyan-300 bg-cyan-50 text-cyan-700"
                        }`}
                    >
                        {drawMode ? "Đang vẽ polygon" : "Bắt đầu vẽ polygon"}
                    </button>
                    <button
                        type="button"
                        onClick={clearPolygon}
                        className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700"
                    >
                        Xóa polygon
                    </button>
                </div>
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

            <p className="mt-2 text-xs text-slate-500">
                Bật chế độ vẽ polygon rồi nhấn lên bản đồ để thêm điểm. Bạn có thể kéo các đỉnh để chỉnh sửa.
            </p>

            {!apiKey ? (
                <p className="mt-3 text-sm text-red-600">Thiếu VITE_GOOGLE_MAPS_API_KEY để hiển thị bản đồ.</p>
            ) : null}
            {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
        </div>
    );
}
