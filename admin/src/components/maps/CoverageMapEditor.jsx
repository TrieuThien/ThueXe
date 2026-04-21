/**
 * CoverageMapEditor.jsx
 * Bản đồ vẽ vùng áp dụng cho gói thuê.
 * Hỗ trợ: polygon (đa giác), circle (hình tròn), rectangle (hình chữ nhật).
 * Dùng Google Maps Drawing Manager.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { loadGoogleMaps } from "./googleMapsLoader";

const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };
const DEFAULT_ZOOM = 11;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** GeoJSON [lng,lat][] → Google Maps {lat,lng}[] */
function geojsonCoordsToLatLng(geojson) {
    const ring = geojson?.coordinates?.[0];
    if (!ring?.length) return [];
    return ring.map(([lng, lat]) => ({ lat, lng }));
}

/** Google Maps Polygon path → GeoJSON Polygon */
function polygonPathToGeojson(path) {
    const pts = path.getArray().map((ll) => [ll.lng(), ll.lat()]);
    if (pts.length < 3) return null;
    return { type: "Polygon", coordinates: [[...pts, pts[0]]] }; // close ring
}

/** Google Maps Rectangle bounds → GeoJSON Polygon */
function boundsToGeojson(bounds) {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const [minLat, maxLat, minLng, maxLng] = [sw.lat(), ne.lat(), sw.lng(), ne.lng()];
    return {
        type: "Polygon",
        coordinates: [[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]],
    };
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {string}   props.coverageType  - 'polygon' | 'circle' | 'rectangle'
 * @param {object}   props.initialData   - { geojson, center_lat, center_lng, radius_km }
 * @param {function} props.onChange      - callback({ geojson, center_lat, center_lng, radius_km })
 */
export default function CoverageMapEditor({ coverageType, initialData, onChange }) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const drawingManagerRef = useRef(null);
    const shapeRef = useRef(null);
    const onChangeRef = useRef(onChange);

    const [loading, setLoading] = useState(true);
    const [mapError, setMapError] = useState("");
    const [hasShape, setHasShape] = useState(false);
    /**
     * mapReady: true sau khi Map + DrawingManager khởi tạo xong.
     * Dùng làm dependency của effect vẽ lại shape cũ để tránh race condition:
     * Effect "draw initial" chạy trước khi mapRef được gán do Google Maps load async.
     */
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    // ── emit dữ liệu shape về parent ─────────────────────────────────────────
    const emitShape = useCallback((shape, type) => {
        if (type === "polygon") {
            const geojson = polygonPathToGeojson(shape.getPath());
            onChangeRef.current({ geojson, center_lat: null, center_lng: null, radius_km: null });
        } else if (type === "rectangle") {
            const geojson = boundsToGeojson(shape.getBounds());
            onChangeRef.current({ geojson, center_lat: null, center_lng: null, radius_km: null });
        } else if (type === "circle") {
            const center = shape.getCenter();
            const radiusKm = Number((shape.getRadius() / 1000).toFixed(4));
            onChangeRef.current({ geojson: null, center_lat: center.lat(), center_lng: center.lng(), radius_km: radiusKm });
        }
    }, []);

    // ── xóa shape hiện tại ───────────────────────────────────────────────────
    const clearShape = useCallback(() => {
        if (shapeRef.current) {
            if (window.google?.maps?.event) {
                window.google.maps.event.clearInstanceListeners(shapeRef.current);
            }
            shapeRef.current.setMap(null);
            shapeRef.current = null;
        }
        setHasShape(false);
        onChangeRef.current({ geojson: null, center_lat: null, center_lng: null, radius_km: null });
    }, []);

    // ── attach listeners vào shape vừa vẽ ───────────────────────────────────
    function attachListeners(shape, type) {
        if (type === "polygon") {
            const path = shape.getPath();
            ["insert_at", "set_at", "remove_at"].forEach((ev) =>
                path.addListener(ev, () => emitShape(shape, "polygon"))
            );
        } else if (type === "rectangle") {
            shape.addListener("bounds_changed", () => emitShape(shape, "rectangle"));
        } else if (type === "circle") {
            shape.addListener("center_changed", () => emitShape(shape, "circle"));
            shape.addListener("radius_changed", () => emitShape(shape, "circle"));
        }
    }

    // ── khởi tạo map + DrawingManager (chạy 1 lần) ───────────────────────────
    useEffect(() => {
        if (!apiKey || !mapContainerRef.current || mapRef.current) return;
        let cancelled = false;

        setLoading(true);
        setMapError("");

        // Cần thư viện 'drawing' cho DrawingManager
        loadGoogleMaps({ apiKey, libraries: ["drawing", "places"] })
            .then(() => {
                if (cancelled) return;

                mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
                    center: DEFAULT_CENTER,
                    zoom: DEFAULT_ZOOM,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    gestureHandling: "greedy",
                });

                const dm = new window.google.maps.drawing.DrawingManager({
                    drawingControl: false,
                    polygonOptions: {
                        editable: true, draggable: false,
                        fillColor: "#3b82f6", fillOpacity: 0.2,
                        strokeColor: "#2563eb", strokeWeight: 2,
                    },
                    rectangleOptions: {
                        editable: true, draggable: false,
                        fillColor: "#8b5cf6", fillOpacity: 0.2,
                        strokeColor: "#7c3aed", strokeWeight: 2,
                    },
                    circleOptions: {
                        editable: true, draggable: false,
                        fillColor: "#10b981", fillOpacity: 0.2,
                        strokeColor: "#059669", strokeWeight: 2,
                    },
                    map: mapRef.current,
                });

                drawingManagerRef.current = dm;

                // Sau khi vẽ xong 1 shape
                window.google.maps.event.addListener(dm, "overlaycomplete", (event) => {
                    // Xóa shape cũ
                    if (shapeRef.current) {
                        window.google.maps.event.clearInstanceListeners(shapeRef.current);
                        shapeRef.current.setMap(null);
                    }
                    shapeRef.current = event.overlay;
                    dm.setDrawingMode(null); // thoát chế độ vẽ
                    setHasShape(true);

                    attachListeners(event.overlay, event.type);
                    emitShape(event.overlay, event.type);
                });

                setLoading(false);
                // Báo hiệu map đã sẵn sàng → kích hoạt effect vẽ lại shape cũ
                setMapReady(true);
            })
            .catch((err) => {
                if (cancelled) return;
                setMapError(err?.message || "Không tải được Google Maps.");
                setLoading(false);
            });

        return () => {
            cancelled = true;
            setMapReady(false);
            if (shapeRef.current) { shapeRef.current.setMap(null); shapeRef.current = null; }
            mapRef.current = null;
            if (mapContainerRef.current) mapContainerRef.current.innerHTML = "";
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiKey]);

    // ── Vẽ lại shape cũ sau khi map sẵn sàng hoặc khi coverageType thay đổi ─────
    //
    // Lý do thêm `mapReady` vào deps:
    //   Effect này check `mapRef.current` nhưng mapRef được gán async bên trong
    //   loadGoogleMaps().then(). Khi modal edit mở, effect này chạy trước khi
    //   mapRef được gán → guard `!mapRef.current` trả true → thoát luôn.
    //   `mapReady` được set thành true SAU KHI map init xong, đảm bảo effect
    //   này chạy lại đúng thời điểm.
    useEffect(() => {
        if (!mapReady || !mapRef.current || !window.google?.maps) return;

        // Luôn xóa shape cũ trước (cả khi đổi loại vùng lẫn khi load lại)
        if (shapeRef.current) {
            window.google.maps.event.clearInstanceListeners(shapeRef.current);
            shapeRef.current.setMap(null);
            shapeRef.current = null;
            setHasShape(false);
        }

        // Không có loại vùng hoặc không có data → dừng lại (chỉ xóa shape cũ)
        if (!coverageType || !initialData) return;

        if (coverageType === "polygon" || coverageType === "rectangle") {
            const points = geojsonCoordsToLatLng(initialData.geojson);
            if (!points.length) return;

            let newShape;
            if (coverageType === "polygon") {
                newShape = new window.google.maps.Polygon({
                    map: mapRef.current, paths: points, editable: true,
                    fillColor: "#3b82f6", fillOpacity: 0.2,
                    strokeColor: "#2563eb", strokeWeight: 2,
                });
            } else {
                const lats = points.map((p) => p.lat);
                const lngs = points.map((p) => p.lng);
                const bounds = new window.google.maps.LatLngBounds(
                    { lat: Math.min(...lats), lng: Math.min(...lngs) },
                    { lat: Math.max(...lats), lng: Math.max(...lngs) }
                );
                newShape = new window.google.maps.Rectangle({
                    map: mapRef.current, bounds, editable: true,
                    fillColor: "#8b5cf6", fillOpacity: 0.2,
                    strokeColor: "#7c3aed", strokeWeight: 2,
                });
            }

            shapeRef.current = newShape;
            attachListeners(newShape, coverageType);
            setHasShape(true);

            // Zoom bản đồ vào vùng đã vẽ
            const b = new window.google.maps.LatLngBounds();
            points.forEach((p) => b.extend(p));
            mapRef.current.fitBounds(b, 40);

        } else if (coverageType === "circle") {
            const { center_lat, center_lng, radius_km } = initialData;
            if (center_lat == null || center_lng == null || !radius_km) return;

            const circle = new window.google.maps.Circle({
                map: mapRef.current,
                center: { lat: Number(center_lat), lng: Number(center_lng) },
                radius: Number(radius_km) * 1000,
                editable: true,
                fillColor: "#10b981", fillOpacity: 0.2,
                strokeColor: "#059669", strokeWeight: 2,
            });

            shapeRef.current = circle;
            attachListeners(circle, "circle");
            setHasShape(true);
            mapRef.current.fitBounds(circle.getBounds(), 40);
        }
    // `attachListeners` và `emitShape` dùng ref nên không cần trong deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, coverageType, initialData]);

    // ── bắt đầu vẽ ───────────────────────────────────────────────────────────
    function startDrawing() {
        if (!drawingManagerRef.current || !window.google?.maps?.drawing || !coverageType) return;
        const modeMap = {
            polygon: window.google.maps.drawing.OverlayType.POLYGON,
            rectangle: window.google.maps.drawing.OverlayType.RECTANGLE,
            circle: window.google.maps.drawing.OverlayType.CIRCLE,
        };
        drawingManagerRef.current.setDrawingMode(modeMap[coverageType] || null);
    }

    if (!apiKey) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Thiếu <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> — bản đồ không khả dụng.
            </div>
        );
    }

    const drawBtnLabel = { polygon: "Vẽ đa giác", circle: "Vẽ hình tròn", rectangle: "Vẽ hình chữ nhật" };
    const tipText = {
        polygon: "Nhấn 'Vẽ đa giác' rồi click từng điểm lên bản đồ. Click điểm đầu tiên để khép đa giác.",
        circle: "Nhấn 'Vẽ hình tròn' rồi click-kéo để tạo vùng tròn. Kéo vòng ngoài để điều chỉnh bán kính.",
        rectangle: "Nhấn 'Vẽ hình chữ nhật' rồi click-kéo trên bản đồ để tạo vùng.",
    };

    return (
        <div className="space-y-2">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={startDrawing}
                    disabled={!coverageType || loading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    {drawBtnLabel[coverageType] || "Vẽ vùng"}
                </button>

                {hasShape && (
                    <button
                        type="button"
                        onClick={clearShape}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa vùng
                    </button>
                )}
                {hasShape && (
                    <span className="text-xs font-medium text-emerald-600">✓ Đã vẽ vùng áp dụng</span>
                )}
            </div>

            {/* Map container */}
            <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <div ref={mapContainerRef} className="h-full w-full" />
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-slate-600">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tải bản đồ...
                    </div>
                )}
                {mapError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 px-4 text-center text-sm text-red-600">
                        {mapError}
                    </div>
                )}
            </div>

            {/* Hướng dẫn */}
            {coverageType && (
                <p className="text-xs text-slate-500">{tipText[coverageType]}</p>
            )}
        </div>
    );
}
