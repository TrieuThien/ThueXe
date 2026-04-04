import { useMemo, useState } from 'react';

const blockColor = {
  available: 'bg-emerald-500',
  unavailable: 'bg-slate-500',
  booked: 'bg-sky-500',
  maintenance: 'bg-amber-500',
};

const viewRanges = {
  day: 1,
  week: 7,
  month: 30,
};

const toDateTimeLocal = (date) => {
  const d = new Date(date);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function VehicleAvailabilityCalendar({
  vehicles,
  selectedVehicleId,
  onSelectedVehicleIdChange,
  calendarView,
  onCalendarViewChange,
  anchorDate,
  onAnchorDateChange,
  availabilityData,
  loading,
  onCreateBlock,
  onDeleteBlock,
  submitting,
}) {
  const [draftBlock, setDraftBlock] = useState({
    type: 'available',
    startAt: toDateTimeLocal(new Date()),
    endAt: toDateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    note: '',
  });

  const timelineColumns = useMemo(() => {
    const days = viewRanges[calendarView] || 7;
    const start = new Date(anchorDate);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: days }).map((_, idx) => {
      const current = new Date(start);
      current.setDate(start.getDate() + idx);
      return current;
    });
  }, [anchorDate, calendarView]);

  const blocks = availabilityData?.blocks || [];

  const createBlock = () => {
    if (!selectedVehicleId) {
      return;
    }
    onCreateBlock(selectedVehicleId, {
      type: draftBlock.type,
      startAt: new Date(draftBlock.startAt).toISOString(),
      endAt: new Date(draftBlock.endAt).toISOString(),
      note: draftBlock.note.trim(),
    });
  };

  return (
    <section className="space-y-3">
      <div className="grid gap-2 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid gap-2 md:grid-cols-3">
            <select
              className="input-field"
              value={selectedVehicleId}
              onChange={(event) => onSelectedVehicleIdChange(event.target.value)}
            >
              <option value="">Chọn xe</option>
              {(vehicles || []).map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plateNumber} - {vehicle.brand} {vehicle.model}
                </option>
              ))}
            </select>

            <select className="input-field" value={calendarView} onChange={(event) => onCalendarViewChange(event.target.value)}>
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
            </select>

            <input
              type="date"
              className="input-field"
              value={anchorDate}
              onChange={(event) => onAnchorDateChange(event.target.value)}
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <div className="grid min-w-[620px]" style={{ gridTemplateColumns: `repeat(${timelineColumns.length}, minmax(80px, 1fr))` }}>
              {timelineColumns.map((day) => (
                <div key={day.toISOString()} className="border-r border-slate-100 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600 last:border-r-0">
                  {day.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                </div>
              ))}
            </div>
            <div className="min-h-14 p-2">
              {loading ? (
                <p className="text-sm text-slate-500">Đang tải lịch...</p>
              ) : null}
              {!loading && blocks.length === 0 ? (
                <p className="text-sm text-slate-500">Không có lịch trong khoảng thời gian này.</p>
              ) : null}
              {!loading && blocks.length > 0 ? (
                <div className="space-y-2">
                  {blocks.map((block) => (
                    <div key={block.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                      <p className="text-sm text-slate-700">
                        <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${blockColor[block.type] || blockColor.unavailable}`} />
                        {block.type} - {new Date(block.startAt).toLocaleString('vi-VN')} {'->'}{' '}
                        {new Date(block.endAt).toLocaleString('vi-VN')}
                      </p>
                      <button type="button" className="btn" onClick={() => onDeleteBlock(selectedVehicleId, block.id)}>
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-bold text-slate-900">Tạo lịch</h3>
          <div className="mt-3 space-y-2">
            <select
              className="input-field"
              value={draftBlock.type}
              onChange={(event) => setDraftBlock((prev) => ({ ...prev, type: event.target.value }))}
            >
              <option value="available">Khả dụng</option>
              <option value="unavailable">Không khả dụng</option>
              <option value="booked">Đã đặt</option>
              <option value="maintenance">Bảo trì</option>
            </select>
            <input
              type="datetime-local"
              className="input-field"
              value={draftBlock.startAt}
              onChange={(event) => setDraftBlock((prev) => ({ ...prev, startAt: event.target.value }))}
            />
            <input
              type="datetime-local"
              className="input-field"
              value={draftBlock.endAt}
              onChange={(event) => setDraftBlock((prev) => ({ ...prev, endAt: event.target.value }))}
            />
            <textarea
              rows={3}
              className="input-field resize-y"
              value={draftBlock.note}
              onChange={(event) => setDraftBlock((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Ghi chú (nếu có)"
            />
            <button type="button" className="btn btn-primary w-full" onClick={createBlock} disabled={!selectedVehicleId || submitting}>
              {submitting ? 'Đang Cập nhật...' : 'Tạo lịch'}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}



