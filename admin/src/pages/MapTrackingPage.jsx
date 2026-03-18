import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPinned, RefreshCw, UserRound } from "lucide-react";
import { getDriverLocation, getDrivers } from "../services/driverService";

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

function toNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function normalizeTrackedDriver(driver, location) {
    const lat = toNumber(location?.lat ?? location?.latitude);
    const lng = toNumber(location?.lng ?? location?.long ?? location?.longitude);

    if (lat === null || lng === null) {
        return null;
    }

    return {
        ...driver,
        tracking: {
            lat,
            lng,
            location_date: location?.location_date || null,
        },
    };
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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=${callbackName}`;
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
    const [selectedDriverId, setSelectedDriverId] = useState(null);

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({});

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

            const buildMap = (resolvedMapId) =>
                new window.google.maps.Map(mapContainerRef.current, {
                    center: DEFAULT_CENTER,
                    zoom: DEFAULT_ZOOM,
                    mapId: resolvedMapId,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    gestureHandling: "greedy",
                });

            if (mapId) {
                try {
                    mapRef.current = buildMap(mapId);
                } catch (mapIdError) {
                    console.warn("Google Maps init with mapId failed, fallback to default map.", mapIdError);
                    mapRef.current = buildMap(undefined);
                    setMapWarning(
                        "Không thể áp dụng VITE_GOOGLE_MAP_ID hiện tại. Đang dùng bản đồ mặc định để đảm bảo hiển thị."
                    );
                }
            } else {
                mapRef.current = buildMap(undefined);
            }
        } catch (error) {
            console.error("Google Maps init error:", error);
            setMapErrorMessage(error?.message || "Không thể khởi tạo Google Maps.");
        } finally {
            setMapLoading(false);
        }
    }, [apiKey, mapId]);

    const clearMarkers = useCallback(() => {
        Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
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
                    title: firstItem.full_name || `Driver #${firstItem.driver_id}`,
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
                    title: item.full_name || `Driver #${item.driver_id}`,
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

            const listPayload = await getDrivers({
                page: 1,
                limit: 100,
                available: 1,
                account_deleted: 0,
                sort_by: "driver_id",
                sort_order: "DESC",
            });

            const drivers = listPayload?.items || [];

            const locationResults = await Promise.allSettled(
                drivers.map((driver) => getDriverLocation(driver.driver_id))
            );

            const merged = drivers
                .map((driver, index) => {
                    const locationResult = locationResults[index];

                    if (locationResult?.status !== "fulfilled") {
                        return null;
                    }

                    const location = locationResult.value?.location;
                    return normalizeTrackedDriver(driver, location);
                })
                .filter(Boolean);

            setTrackedDrivers(merged);
            setSelectedDriverId((prev) => {
                if (prev && merged.some((item) => item.driver_id === prev)) {
                    return prev;
                }

                return merged[0]?.driver_id || null;
            });
        } catch (error) {
            setTrackedDrivers([]);
            setSelectedDriverId(null);
            setErrorMessage(error?.response?.data?.message || error?.message || "Không tải được dữ liệu bản đồ theo dõi.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        initMap();
    }, [initMap]);

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
                        <h2 className="text-base font-bold">Tài xế đang có vị trí ({trackedDrivers.length})</h2>
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
                                            {driver.full_name || `Driver #${driver.driver_id}`}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">Driver #{driver.driver_id}</p>
                                        <p className="mt-1 text-xs text-slate-600">Khu vuc: {driver.route_name || "--"}</p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            Cap nhat: {formatDateTime(driver.tracking.location_date)}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            ({driver.tracking.lat.toFixed(6)}, {driver.tracking.lng.toFixed(6)})
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
