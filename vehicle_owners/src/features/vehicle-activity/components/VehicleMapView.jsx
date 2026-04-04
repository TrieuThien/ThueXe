import { useMemo, useState } from 'react';

const statusColors = {
  available: 'bg-emerald-500',
  rented: 'bg-sky-500',
  maintenance: 'bg-amber-500',
  unavailable: 'bg-slate-500',
};

const getBounds = (items) => {
  if (!items.length) {
    return { minLat: 8, maxLat: 24, minLng: 102, maxLng: 110 };
  }
  const lats = items.map((x) => x.location.lat);
  const lngs = items.map((x) => x.location.lng);
  return {
    minLat: Math.min(...lats) - 0.5,
    maxLat: Math.max(...lats) + 0.5,
    minLng: Math.min(...lngs) - 0.5,
    maxLng: Math.max(...lngs) + 0.5,
  };
};

const toPercent = (value, min, max) => {
  if (max <= min) {
    return 50;
  }
  return ((value - min) / (max - min)) * 100;
};

export default function VehicleMapView({ locations, statusFilter, onStatusFilterChange, loading }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const items = locations?.items || [];
  const filtered = statusFilter === 'all' ? items : items.filter((item) => item.status === statusFilter);
  const bounds = useMemo(() => getBounds(filtered), [filtered]);
  const selected = filtered.find((item) => item.id === selectedVehicleId) || null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">Theo dõi vị trí xe theo trạng thái hoạt động.</p>
        <select
          className="input-field max-w-56"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
        >
          <option value="all">Tất cả Trạng thái</option>
          <option value="available">Khả dụng</option>
          <option value="rented">Đã cho thuê</option>
          <option value="maintenance">Bảo trì</option>
          <option value="unavailable">Không khả dụng</option>
        </select>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="relative min-h-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-50 via-sky-50 to-white">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#94a3b8_0.7px,transparent_0.7px)] [background-size:18px_18px]" />
          {loading ? (
            <p className="absolute inset-0 grid place-items-center text-sm text-slate-500">Đang tải dữ liệu vị trí...</p>
          ) : null}
          {!loading && filtered.length === 0 ? (
            <p className="absolute inset-0 grid place-items-center text-sm text-slate-500">
              Chưa có dữ liệu vị trí xe cho bộ lọc hiện tại.
            </p>
          ) : null}
          {!loading &&
            filtered.map((vehicle) => {
              const left = toPercent(vehicle.location.lat, bounds.minLat, bounds.maxLat);
              const top = 100 - toPercent(vehicle.location.lng, bounds.minLng, bounds.maxLng);
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${left}%`, top: `${top}%` }}
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                >
                  <span
                    className={`block h-4 w-4 rounded-full border-2 border-white shadow ${statusColors[vehicle.status] || statusColors.unavailable}`}
                  />
                </button>
              );
            })}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-bold text-slate-900">Thông tin của xe</h3>
          {!selected ? (
            <p className="mt-2 text-sm text-slate-500">Nhấn vào biểu tượng để xem thông tin xe.</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-semibold text-slate-900">{selected.plateNumber}</p>
              <p className="text-slate-700">{`${selected.brand} ${selected.model} ${selected.year}`}</p>
              <p className="text-slate-700">Trạng thái: {selected.status}</p>
              <p className="text-slate-700">Xác minh: {selected.verificationStatus}</p>
              <p className="text-slate-700">Vị tri: {selected.location?.label || '--'}</p>
              <p className="text-slate-500">Cập nhật: {new Date(selected.location?.updatedAt || '').toLocaleString('vi-VN')}</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}



