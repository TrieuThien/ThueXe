import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPinned, RefreshCw, UserRound } from "lucide-react";
import { getOnlineDriversWithLocations } from "../services/driverService";

const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };
const DEFAULT_ZOOM = 11;
const GOOGLE_MAPS_SCRIPT_ID = "google-maps-js-sdk";

function formatDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function loadGoogleMapsScript(apiKey) {
    if (window.google?.maps) {
        return Promise.resolve(window.google);
    }

    if (window.__googleMapsLoadingPromise) {
        return window.__googleMapsLoadingPromise;
    }

    window.__googleMapsLoadingPromise = new Promise((resolve, reject) => {
        const callbackName = `__googleMapsInit_${Date.now()}`;
        const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
        const script = existingScript || document.createElement("script");

        window[callbackName] = () => {
            delete window[callbackName];
            resolve(window.google);
        };

        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.async = true;
        script.defer = true;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=${callbackName}`;
        script.onerror = () => {
            delete window[callbackName];
            window.__googleMapsLoadingPromise = null;
            reject(new Error("Không tải được Google Maps script từ maps.googleapis.com."));
        };

        if (!existingScript) {
            document.head.appendChild(script);
        }
    });

    return window.__googleMapsLoadingPromise;
}

export default function MapTrackingPage() {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
    const mapId = import.meta.env.VITE_GOOGLE_MAP_ID?.trim() || "";
    
    const [loading, setLoading] = useState(true);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapWarning, setMapWarning] = useState("");
    const [mapErrorMessage, setMapErrorMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [trackedDrivers, setTrackedDrivers] = useState([]);
    const [totalOnline, setTotalOnline] = useState(0);
    const [selectedDriverId, setSelectedDriverId] = useState(null);

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({});
    const destroyedRef = useRef(false);

    const selectedDriver = useMemo(
        () => trackedDrivers.find((item) => item.driver_id === selectedDriverId) || null,
        [trackedDrivers, selectedDriverId]
    );

    const initMap = useCallback(async () => {
        if (!apiKey || !mapContainerRef.current || mapRef.current) {
            return;
        }

        setMapLoading(true);
        setMapWarning("");
        setMapErrorMessage("");

        try {
            await loadGoogleMapsScript(apiKey);
            if (destroyedRef.current || !mapContainerRef.current) return;

            const buildMap = (resolvedMapId) =>
                new window.google.maps.Map(mapContainerRef.current, {
                    center: DEFAULT_CENTER,
                    zoom: DEFAULT_ZOOM,
                    ...(!resolvedMapId
                        ? { renderingType: window.google?.maps?.RenderingType?.RASTER || "RASTER" }
                        : {}),
                    mapId: resolvedMapId,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    gestureHandling: "greedy",
                });

            if (mapId) {
                try {
                    if (destroyedRef.current || !mapContainerRef.current) return;
                    mapRef.current = buildMap(mapId);
                } catch (mapIdError) {
                    console.warn("Google Maps init with mapId failed, fallback to default map.", mapIdError);
                    if (destroyedRef.current || !mapContainerRef.current) return;
                    mapRef.current = buildMap(undefined);
                    setMapWarning(
                        "Không thể áp dụng VITE_GOOGLE_MAP_ID hiện tại. Đang dùng bản đồ mặc định để đảm bảo hiển thị."
                    );
                }
            } else {
                if (destroyedRef.current || !mapContainerRef.current) return;
                mapRef.current = buildMap(undefined);
            }
        } catch (error) {
            if (destroyedRef.current) return;
            console.error("Google Maps init error:", error);
            setMapErrorMessage(error?.message || "Không thể khởi tạo Google Maps.");
        } finally {
            if (!destroyedRef.current) setMapLoading(false);
        }
    }, [apiKey, mapId]);

    const clearMarkers = useCallback(() => {
        Object.values(markersRef.current).forEach((marker) => {
            if (window.google?.maps?.event?.clearInstanceListeners) {
                window.google.maps.event.clearInstanceListeners(marker);
            }
            marker.setMap(null);
        });
        markersRef.current = {};
    }, []);

    const renderMarkers = useCallback(
        (items) => {
            if (!mapRef.current || !window.google?.maps) {
                return;
            }

            clearMarkers();

            if (!items.length) {
                mapRef.current.setCenter(DEFAULT_CENTER);
                mapRef.current.setZoom(DEFAULT_ZOOM);
                return;
            }

            if (items.length === 1) {
                const firstItem = items[0];
                const position = {
                    lat: firstItem.tracking.lat,
                    lng: firstItem.tracking.lng,
                };

                const marker = new window.google.maps.Marker({
                    map: mapRef.current,
                    position,
                    title: firstItem.full_name || `Tài xế #${firstItem.driver_id}`,
                });

                marker.addListener("click", () => {
                    setSelectedDriverId(firstItem.driver_id);
                });

                markersRef.current[firstItem.driver_id] = marker;
                mapRef.current.setCenter(position);
                mapRef.current.setZoom(15);
                return;
            }

            const bounds = new window.google.maps.LatLngBounds();

            items.forEach((item) => {
                const position = {
                    lat: item.tracking.lat,
                    lng: item.tracking.lng,
                };

                const marker = new window.google.maps.Marker({
                    map: mapRef.current,
                    position,
                    title: item.full_name || `Tài xế #${item.driver_id}`,
                });

                marker.addListener("click", () => {
                    setSelectedDriverId(item.driver_id);
                });

                markersRef.current[item.driver_id] = marker;
                bounds.extend(position);
            });

            mapRef.current.fitBounds(bounds, 64);
        },
        [clearMarkers]
    );

    const loadTracking = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const payload = await getOnlineDriversWithLocations();
            const allDrivers = payload?.drivers || [];

            setTotalOnline(payload?.total_online ?? 0);

            const tracked = allDrivers
                .filter((d) => d.lat !== null && d.lng !== null)
                .map((d) => ({
                    ...d,
                    tracking: { lat: d.lat, lng: d.lng, location_date: d.location_date },
                }));

            setTrackedDrivers(tracked);
            setSelectedDriverId((prev) => {
                if (prev && tracked.some((item) => item.driver_id === prev)) {
                    return prev;
                }
                return tracked[0]?.driver_id || null;
            });
        } catch (error) {
            setTrackedDrivers([]);
            setTotalOnline(0);
            setSelectedDriverId(null);
            setErrorMessage(error?.response?.data?.message || error?.message || "Không tải được dữ liệu bản đồ theo dõi.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        destroyedRef.current = false;
        initMap();

        return () => {
            destroyedRef.current = true;
            clearMarkers();

            if (mapRef.current && window.google?.maps?.event?.clearInstanceListeners) {
                window.google.maps.event.clearInstanceListeners(mapRef.current);
            }
            mapRef.current = null;

            if (mapContainerRef.current) {
                mapContainerRef.current.innerHTML = "";
            }
        };
    }, [clearMarkers, initMap]);

    useEffect(() => {
        if (!apiKey) {
            setLoading(false);
            setErrorMessage("Thiếu VITE_GOOGLE_MAPS_API_KEY. Hãy thêm API key để hiển thị Google Maps.");
            return;
        }

        loadTracking();
    }, [apiKey, loadTracking]);

    useEffect(() => {
        renderMarkers(trackedDrivers);
    }, [trackedDrivers, renderMarkers]);

    useEffect(() => {
        if (!selectedDriverId || !mapRef.current || !markersRef.current[selectedDriverId]) {
            return;
        }

        const marker = markersRef.current[selectedDriverId];
        const position = marker.getPosition();

        if (position) {
            mapRef.current.panTo(position);
            if ((mapRef.current.getZoom() || DEFAULT_ZOOM) < 15) {
                mapRef.current.setZoom(15);
            }
        }
    }, [selectedDriverId]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Map tracking</p>
                    <h1 className="mt-2 text-3xl font-bold">Bản đồ theo dõi tài xế</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">
                        Hiển thị vị trí mới nhất của tài xế online trên Google Maps.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
                            <span className="h-2 w-2 rounded-full bg-green-400" />
                            Tài xế online: {loading ? "..." : totalOnline}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
                            <MapPinned className="h-3.5 w-3.5 text-cyan-300" />
                            Có vị trí GPS: {loading ? "..." : trackedDrivers.length}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={loadTracking}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Tải lại vị trí
                </button>
            </div>

            {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                </div>
            ) : null}
            {mapErrorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{mapErrorMessage}</span>
                    </div>
                </div>
            ) : null}

            <section className="grid gap-5 xl:grid-cols-[340px,1fr]">
                <article className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-slate-900">
                        <MapPinned className="h-5 w-5 text-cyan-600" />
                        <h2 className="text-base font-bold">Tài xế có vị trí GPS ({trackedDrivers.length})</h2>
                    </div>

                    {loading ? (
                        <div className="flex min-h-[160px] items-center justify-center gap-3 text-sm text-slate-600">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Đang tải dữ liệu theo dõi...
                        </div>
                    ) : trackedDrivers.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Chưa có tài xế online nào có dữ liệu vị trí hợp lệ.
                        </div>
                    ) : (
                        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                            {trackedDrivers.map((driver) => {
                                const isSelected = selectedDriverId === driver.driver_id;

                                return (
                                    <button
                                        key={driver.driver_id}
                                        type="button"
                                        onClick={() => setSelectedDriverId(driver.driver_id)}
                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isSelected
                                                ? "border-cyan-300 bg-cyan-50"
                                                : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/40"
                                            }`}
                                    >
                                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <UserRound className="h-4 w-4 text-cyan-600" />
                                            {driver.full_name || `Tài xế #${driver.driver_id}`}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">Tài xế #{driver.driver_id}</p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            Vị trí: ({driver.tracking.lat.toFixed(6)}, {driver.tracking.lng.toFixed(6)}) | Cập nhật: {formatDateTime(driver.tracking.location_date)} 
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </article>

                <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-base font-bold text-slate-900">Google Maps</h2>
                    </div>
                    {mapWarning ? (
                        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
                            {mapWarning}
                        </div>
                    ) : null}

                    <div className="relative h-[520px] w-full bg-slate-100">
                        <div ref={mapContainerRef} className="h-full w-full" />

                        {mapLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-slate-700">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang khởi tạo Google Maps...
                            </div>
                        ) : null}
                    </div>

                    {selectedDriver ? (
                        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
                            Đang chọn: <span className="font-semibold text-slate-900">{selectedDriver.full_name}</span>
                            {" - "}
                            {selectedDriver.tracking.lat.toFixed(6)}, {selectedDriver.tracking.lng.toFixed(6)}
                        </div>
                    ) : null}
                </article>
            </section>
        </div>
    );
}
