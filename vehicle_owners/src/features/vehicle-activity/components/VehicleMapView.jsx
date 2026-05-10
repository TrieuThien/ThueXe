import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_CENTER = { lat: 16.2, lng: 106.2 };
const DEFAULT_ZOOM = 6;
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-js-sdk-owner-vehicles';

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
    const script = existingScript || document.createElement('script');

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
      reject(new Error('Không tải được Google Maps script.'));
    };

    if (!existingScript) {
      document.head.appendChild(script);
    }
  });

  return window.__googleMapsLoadingPromise;
}

const statusLabel = {
  available: 'Khả dụng',
  rented: 'Đã cho thuê',
  maintenance: 'Bảo trì',
  unavailable: 'Không khả dụng',
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeItems = (items) => {
  return items
    .map((item) => {
      const lat = toNumber(item?.location?.lat);
      const lng = toNumber(item?.location?.lng);
      const normalizedStatus = String(item?.status || '').trim().toLowerCase();
      return {
        ...item,
        status: normalizedStatus || item?.status,
        hasGps: lat !== null && lng !== null,
        location: lat !== null && lng !== null ? { lat, lng } : null,
      };
    });
};

export default function VehicleMapView({ locations, statusFilter, onStatusFilterChange, loading }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
  const mapId = import.meta.env.VITE_GOOGLE_MAP_ID?.trim() || '';

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [mapLoading, setMapLoading] = useState(false);
  const [mapWarning, setMapWarning] = useState('');
  const [mapError, setMapError] = useState('');

  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const items = useMemo(() => normalizeItems(locations?.items || []), [locations]);
  const filtered = statusFilter === 'all' ? items : items.filter((item) => item.status === statusFilter);
  const mappableVehicles = filtered.filter((item) => item.hasGps && item.location);
  const selected = filtered.find((item) => item.id === selectedVehicleId) || null;

  useEffect(() => {
    if (filtered.length && !selected) {
      setSelectedVehicleId(filtered[0].id);
    }
  }, [filtered, selected]);

  useEffect(() => {
    let unmounted = false;

    if (!apiKey) {
      setMapError('Thiếu VITE_GOOGLE_MAPS_API_KEY để hiển thị bản đồ Google Maps.');
      return undefined;
    }

    const initMap = async () => {
      setMapLoading(true);
      setMapError('');
      setMapWarning('');

      try {
        await loadGoogleMapsScript(apiKey);
        if (unmounted || !mapElementRef.current || mapRef.current) return;

        const buildMap = (resolvedMapId) =>
          new window.google.maps.Map(mapElementRef.current, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            ...(!resolvedMapId
              ? { renderingType: window.google?.maps?.RenderingType?.RASTER || 'RASTER' }
              : {}),
            mapId: resolvedMapId,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy',
          });

        if (mapId) {
          try {
            mapRef.current = buildMap(mapId);
          } catch {
            mapRef.current = buildMap(undefined);
            setMapWarning('Không thể áp dụng VITE_GOOGLE_MAP_ID hiện tại. Đang dùng bản đồ mặc định.');
          }
        } else {
          mapRef.current = buildMap(undefined);
        }
      } catch (error) {
        if (!unmounted) {
          setMapError(error?.message || 'Không thể khởi tạo Google Maps.');
        }
      } finally {
        if (!unmounted) setMapLoading(false);
      }
    };

    initMap();

    return () => {
      unmounted = true;
      Object.values(markersRef.current).forEach((marker) => {
        if (window.google?.maps?.event?.clearInstanceListeners) {
          window.google.maps.event.clearInstanceListeners(marker);
        }
        marker.setMap(null);
      });
      markersRef.current = {};
      if (mapRef.current && window.google?.maps?.event?.clearInstanceListeners) {
        window.google.maps.event.clearInstanceListeners(mapRef.current);
      }
      mapRef.current = null;
      if (mapElementRef.current) {
        mapElementRef.current.innerHTML = '';
      }
    };
  }, [apiKey, mapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    Object.values(markersRef.current).forEach((marker) => {
      if (window.google?.maps?.event?.clearInstanceListeners) {
        window.google.maps.event.clearInstanceListeners(marker);
      }
      marker.setMap(null);
    });
    markersRef.current = {};

    if (!mappableVehicles.length) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();

    mappableVehicles.forEach((vehicle) => {
      const position = { lat: vehicle.location.lat, lng: vehicle.location.lng };
      const marker = new window.google.maps.Marker({
        map,
        position,
        title: vehicle.plateNumber || `Xe #${vehicle.id}`,
      });

      marker.addListener('click', () => {
        setSelectedVehicleId(vehicle.id);
      });

      markersRef.current[vehicle.id] = marker;
      bounds.extend(position);
    });

    if (mappableVehicles.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
      return;
    }

    map.fitBounds(bounds, 60);
  }, [mappableVehicles]);

  useEffect(() => {
    if (!selectedVehicleId || !mapRef.current) return;

    const marker = markersRef.current[selectedVehicleId];
    if (!marker) return;

    const position = marker.getPosition();
    if (position) {
      mapRef.current.panTo(position);
      if ((mapRef.current.getZoom() || DEFAULT_ZOOM) < 14) {
        mapRef.current.setZoom(14);
      }
    }
  }, [selectedVehicleId]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">Theo dõi vị trí xe theo trạng thái hoạt động.</p>
        <select
          className="input-field max-w-56"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="available">Khả dụng</option>
          <option value="rented">Đã cho thuê</option>
          <option value="maintenance">Bảo trì</option>
          <option value="unavailable">Không khả dụng</option>
        </select>
      </div>

      {mapWarning ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{mapWarning}</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <div className="relative min-h-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <div ref={mapElementRef} className="absolute inset-0" />

          {(loading || mapLoading) && (
            <p className="absolute inset-0 grid place-items-center text-sm text-slate-500">Đang tải dữ liệu vị trí...</p>
          )}
          {!loading && !mapLoading && filtered.length === 0 ? (
            <p className="absolute inset-0 grid place-items-center text-sm text-slate-500">
              Không có xe nào phù hợp bộ lọc hiện tại.
            </p>
          ) : null}
          {!loading && !mapLoading && filtered.length > 0 && mappableVehicles.length === 0 ? (
            <p className="absolute inset-0 grid place-items-center text-sm text-slate-500">
              Các xe trong bộ lọc này chưa có vị trí GPS.
            </p>
          ) : null}
          {mapError ? <p className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-rose-600">{mapError}</p> : null}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-bold text-slate-900">Danh sách xe ({filtered.length})</h3>
          <p className="mt-1 text-xs text-slate-500">Chọn xe để định vị trên bản đồ.</p>

          {filtered.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Không có xe nào phù hợp bộ lọc.</p>
          ) : (
            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
              {filtered.map((vehicle) => {
                const isActive = String(vehicle.id) === String(selectedVehicleId);
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? 'border-sky-300 bg-sky-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{vehicle.plateNumber}</p>
                    <p className="text-xs text-slate-600">{`${vehicle.brand} ${vehicle.model} ${vehicle.year || ''}`}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Trạng thái: {statusLabel[vehicle.status] || vehicle.status}</p>
                    {!vehicle.hasGps ? <p className="mt-0.5 text-xs font-medium text-amber-600">Chưa có vị trí GPS</p> : null}
                  </button>
                );
              })}
            </div>
          )}

          <h4 className="mt-4 text-sm font-semibold text-slate-800">Thông tin xe đã chọn</h4>
          {!selected ? (
            <p className="mt-2 text-sm text-slate-500">Nhấn vào marker hoặc chọn xe trong danh sách.</p>
          ) : (
            <div className="mt-2 space-y-2 text-sm">
              <p className="font-semibold text-slate-900">{selected.plateNumber}</p>
              <p className="text-slate-700">{`${selected.brand} ${selected.model} ${selected.year}`}</p>
              <p className="text-slate-700">Trạng thái: {statusLabel[selected.status] || selected.status}</p>
              <p className="text-slate-700">Xác minh: {selected.verificationStatus == "verified" ? "Đã xác minh" : "Chưa xác minh"}</p>
              {selected.hasGps && selected.location ? (
                <p className="text-slate-700">Tọa độ: {selected.location.lat.toFixed(5)}, {selected.location.lng.toFixed(5)}</p>
              ) : (
                <p className="text-amber-600">Chưa có vị trí GPS</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
