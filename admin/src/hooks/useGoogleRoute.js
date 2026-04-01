import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps } from "../components/maps/googleMapsLoader";
import {
    clearMapObjectListeners,
    createBoundsFromPath,
    detachMapObject,
    durationToText,
    normalizeLatLng,
    parseDurationSeconds,
} from "../components/maps/mapHelpers";

const DEFAULT_ROUTE_FIELDS = ["path", "viewport", "distanceMeters", "durationMillis"];

export default function useGoogleRoute({
    apiKey,
    mapId,
    mapContainerRef,
    origin,
    destination,
    travelMode = "DRIVING",
    enabled = true,
    routingPreference = "TRAFFIC_AWARE",
    routeFields = DEFAULT_ROUTE_FIELDS,
    onRouteChange,
    onRouteError,
}) {
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [routeInfo, setRouteInfo] = useState(null);

    const mapRef = useRef(null);
    const markerClassRef = useRef(null);
    const routeClassRef = useRef(null);
    const originMarkerRef = useRef(null);
    const destinationMarkerRef = useRef(null);
    const routePolylinesRef = useRef([]);
    const requestSeqRef = useRef(0);
    const mountedRef = useRef(false);

    const normalizedOrigin = useMemo(() => normalizeLatLng(origin), [origin]);
    const normalizedDestination = useMemo(() => normalizeLatLng(destination), [destination]);

    const clearRoute = useCallback(() => {
        routePolylinesRef.current.forEach((polyline) => {
            clearMapObjectListeners(polyline);
            detachMapObject(polyline);
        });
        routePolylinesRef.current = [];
        setRouteInfo(null);
    }, []);

    const setMarkerPosition = useCallback((markerRef, position, title) => {
        if (!mapRef.current || !markerRef.current) return;
        if (!position) {
            detachMapObject(markerRef.current);
            return;
        }

        if (typeof markerRef.current.setPosition === "function") {
            markerRef.current.setPosition(position);
            if (typeof markerRef.current.setMap === "function") markerRef.current.setMap(mapRef.current);
            return;
        }

        markerRef.current.position = position;
        markerRef.current.map = mapRef.current;
        markerRef.current.title = title || markerRef.current.title;
    }, []);

    const setOriginMarker = useCallback((position) => {
        const normalized = normalizeLatLng(position);
        setMarkerPosition(originMarkerRef, normalized, "Diem don");
    }, [setMarkerPosition]);

    const setDestinationMarker = useCallback((position) => {
        const normalized = normalizeLatLng(position);
        setMarkerPosition(destinationMarkerRef, normalized, "Diem den");
    }, [setMarkerPosition]);

    const drawRoute = useCallback(async (originOverride, destinationOverride) => {
        if (!mapRef.current || !routeClassRef.current?.computeRoutes) {
            const routeError = "ROUTES_API_UNAVAILABLE";
            setError(routeError);
            throw new Error(routeError);
        }

        const routeOrigin = normalizeLatLng(originOverride || normalizedOrigin);
        const routeDestination = normalizeLatLng(destinationOverride || normalizedDestination);
        if (!routeOrigin || !routeDestination) {
            clearRoute();
            setOriginMarker(routeOrigin);
            setDestinationMarker(routeDestination);
            return null;
        }

        const samePoint =
            Math.abs(routeOrigin.lat - routeDestination.lat) < 0.00001 &&
            Math.abs(routeOrigin.lng - routeDestination.lng) < 0.00001;
        if (samePoint) {
            clearRoute();
            setOriginMarker(routeOrigin);
            setDestinationMarker(routeDestination);
            return null;
        }

        const requestId = ++requestSeqRef.current;
        setIsLoading(true);
        setError("");
        setOriginMarker(routeOrigin);
        setDestinationMarker(routeDestination);
        clearRoute();

        try {
            const response = await routeClassRef.current.computeRoutes({
                origin: routeOrigin,
                destination: routeDestination,
                travelMode,
                routingPreference,
                fields: routeFields,
            });

            if (!mountedRef.current || requestId !== requestSeqRef.current) return null;

            const route = response?.routes?.[0];
            if (!route) throw new Error("ROUTE_NOT_FOUND");

            const polylines = route?.createPolylines
                ? await Promise.resolve(
                    route.createPolylines({
                        strokeColor: "#0891b2",
                        strokeOpacity: 0.9,
                        strokeWeight: 6,
                    })
                )
                : [];

            routePolylinesRef.current = Array.isArray(polylines) ? polylines : [];
            routePolylinesRef.current.forEach((polyline) => polyline.setMap(mapRef.current));

            if (!routePolylinesRef.current.length && Array.isArray(route?.path) && route.path.length > 1) {
                const fallbackPath = route.path
                    .map((point) => {
                        const lat = typeof point?.lat === "function" ? point.lat() : Number(point?.lat);
                        const lng = typeof point?.lng === "function" ? point.lng() : Number(point?.lng);
                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                        return { lat, lng };
                    })
                    .filter(Boolean);

                if (fallbackPath.length > 1) {
                    const fallbackPolyline = new window.google.maps.Polyline({
                        map: mapRef.current,
                        path: fallbackPath,
                        strokeColor: "#0891b2",
                        strokeOpacity: 0.9,
                        strokeWeight: 6,
                    });
                    routePolylinesRef.current = [fallbackPolyline];
                }
            }

            if (!routePolylinesRef.current.length) {
                throw new Error("ROUTE_POLYLINE_MISSING");
            }

            if (route.viewport) {
                mapRef.current.fitBounds(route.viewport, 80);
            } else {
                const bounds = createBoundsFromPath(route.path || []);
                if (bounds) mapRef.current.fitBounds(bounds, 80);
            }

            const distanceMeters = Number(route.distanceMeters);
            const distanceKm = Number.isFinite(distanceMeters) ? Number((distanceMeters / 1000).toFixed(2)) : null;
            const durationSeconds = parseDurationSeconds(route);
            const info = {
                distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : null,
                distanceKm,
                durationSeconds,
                durationText: durationToText(durationSeconds),
                durationMillis: Number.isFinite(Number(route.durationMillis)) ? Number(route.durationMillis) : null,
                encodedPolyline: route?.polyline?.encodedPolyline || null,
                viewport: route.viewport || null,
                rawRoute: route,
            };

            setRouteInfo(info);
            if (typeof onRouteChange === "function") onRouteChange(info, response);
            return info;
        } catch (err) {
            if (!mountedRef.current || requestId !== requestSeqRef.current) return null;
            const message = err?.message || "ROUTE_DRAW_FAILED";
            setError(message);
            if (typeof onRouteError === "function") onRouteError(err);
            throw err;
        } finally {
            if (mountedRef.current && requestId === requestSeqRef.current) {
                setIsLoading(false);
            }
        }
    }, [
        clearRoute,
        normalizedDestination,
        normalizedOrigin,
        onRouteChange,
        onRouteError,
        routeFields,
        routingPreference,
        setDestinationMarker,
        setOriginMarker,
        travelMode,
    ]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!enabled || !apiKey || !mapContainerRef?.current || mapRef.current) return undefined;

        let cancelled = false;

        async function initMap() {
            try {
                setIsLoading(true);
                setError("");
                await loadGoogleMaps({
                    apiKey,
                    libraries: mapId ? ["places", "routes", "marker"] : ["places", "routes"],
                });
                if (cancelled) return;

                mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
                    center: { lat: 10.7769, lng: 106.7009 },
                    zoom: 12,
                    mapTypeControl: false,
                    streetViewControl: false,
                    ...(!mapId
                        ? { renderingType: window.google?.maps?.RenderingType?.RASTER || "RASTER" }
                        : {}),
                    ...(mapId ? { mapId } : {}),
                });

                if (window.google?.maps?.importLibrary && mapId) {
                    try {
                        const markerLib = await window.google.maps.importLibrary("marker");
                        if (!cancelled) markerClassRef.current = markerLib?.AdvancedMarkerElement || null;
                    } catch {
                        markerClassRef.current = null;
                    }
                } else {
                    markerClassRef.current = null;
                }

                if (window.google?.maps?.importLibrary) {
                    const routesLib = await window.google.maps.importLibrary("routes");
                    if (!cancelled) routeClassRef.current = routesLib?.Route || null;
                }

                if (cancelled) return;

                if (markerClassRef.current) {
                    originMarkerRef.current = new markerClassRef.current({ map: mapRef.current, title: "Diem don" });
                    destinationMarkerRef.current = new markerClassRef.current({ map: mapRef.current, title: "Diem den" });
                } else {
                    originMarkerRef.current = new window.google.maps.Marker({ map: mapRef.current, title: "Diem don" });
                    destinationMarkerRef.current = new window.google.maps.Marker({ map: mapRef.current, title: "Diem den" });
                }

                setIsReady(true);
            } catch (err) {
                if (cancelled) return;
                setError(err?.message || "GOOGLE_MAP_INIT_FAILED");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        initMap();

        return () => {
            cancelled = true;
            requestSeqRef.current += 1;

            clearRoute();
            clearMapObjectListeners(originMarkerRef.current);
            clearMapObjectListeners(destinationMarkerRef.current);
            detachMapObject(originMarkerRef.current);
            detachMapObject(destinationMarkerRef.current);
            originMarkerRef.current = null;
            destinationMarkerRef.current = null;

            clearMapObjectListeners(mapRef.current);
            mapRef.current = null;
            markerClassRef.current = null;
            routeClassRef.current = null;

            // Remove map canvas from DOM to help browser release WebGL/Raster contexts on page switches.
            if (mapContainerRef?.current) {
                mapContainerRef.current.innerHTML = "";
            }
            setIsReady(false);
        };
    }, [apiKey, clearRoute, enabled, mapContainerRef, mapId]);

    useEffect(() => {
        if (!enabled || !isReady) return;
        drawRoute().catch(() => {});
    }, [drawRoute, enabled, isReady, normalizedDestination, normalizedOrigin]);

    return {
        map: mapRef.current,
        isReady,
        isLoading,
        error,
        routeInfo,
        drawRoute,
        clearRoute,
        setOriginMarker,
        setDestinationMarker,
    };
}
