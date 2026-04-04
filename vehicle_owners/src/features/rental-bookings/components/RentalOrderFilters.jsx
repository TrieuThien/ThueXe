import { RENTAL_SERVICE_TYPE_LABELS } from '../constants';

export default function RentalOrderFilters({ value, vehicles, onChange, onReset }) {
  const setField = (key, next) => onChange({ ...value, [key]: next, page: 1 });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <input
          className="input-field"
          value={value.search}
          onChange={(event) => setField('search', event.target.value)}
          placeholder="Tim mã đơn, khách, biển số..."
        />

        <select className="input-field" value={value.status} onChange={(event) => setField('status', event.target.value)}>
          <option value="all">Tất cả trạng thái đơn</option>
          <option value="pending">Chờ xác nhận</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="in_progress">Đang thuê</option>
          <option value="completed">Hoàn tất</option>
          <option value="canceled">Đã Hủy</option>
        </select>

        <select
          className="input-field"
          value={value.serviceType}
          onChange={(event) => setField('serviceType', event.target.value)}
        >
          <option value="all">Tất cả dịch vụ</option>
          {Object.entries(RENTAL_SERVICE_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select className="input-field" value={value.vehicleId} onChange={(event) => setField('vehicleId', event.target.value)}>
          <option value="all">Tất cả xe</option>
          {(vehicles || []).map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plateNumber} - {vehicle.vehicleName}
            </option>
          ))}
        </select>

        <button type="button" className="btn" onClick={onReset}>
          Đặt lại bộ lọc
        </button>
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="w-28">Từ ngày</span>
          <input type="date" className="input-field" value={value.dateFrom} onChange={(event) => setField('dateFrom', event.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="w-28">Đến ngày</span>
          <input type="date" className="input-field" value={value.dateTo} onChange={(event) => setField('dateTo', event.target.value)} />
        </label>
      </div>
    </section>
  );
}


