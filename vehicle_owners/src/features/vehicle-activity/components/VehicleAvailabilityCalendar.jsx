import { useMemo, useState } from 'react';

const blockColor = {
  booked: 'bg-sky-500',
  maintenance: 'bg-amber-500',
};

const blockLabel = {
  booked: 'Đã được đặt',
  maintenance: 'Bảo trì',
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
    if (!selectedVehicleId) return;
    onCreateBlock(selectedVehicleId, {
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
                    <div key={`${block.type}-${block.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                      <p className="text-sm text-slate-700">
                        <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${blockColor[block.type] || 'bg-slate-400'}`} />
                        <span className="font-medium">{blockLabel[block.type] || block.type}</span>
                        {block.note ? <span className="ml-1 text-slate-500">({block.note})</span> : null}
                        {' — '}
                        {new Date(block.startAt).toLocaleString('vi-VN')}
                        {' → '}
                        {new Date(block.endAt).toLocaleString('vi-VN')}
                      </p>
                      {block.deletable ? (
                        <button type="button" className="btn" onClick={() => onDeleteBlock(selectedVehicleId, block.id)}>
                          Xóa
                        </button>
                      ) : (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-600">Đặt bởi khách</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-bold text-slate-900">Tạo lịch bảo trì</h3>
          <p className="mt-1 text-xs text-slate-500">Trong thời gian bảo trì, xe sẽ không xuất hiện để khách đặt.</p>
          <div className="mt-3 space-y-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Bắt đầu</label>
              <input
                type="datetime-local"
                className="input-field"
                value={draftBlock.startAt}
                onChange={(event) => setDraftBlock((prev) => ({ ...prev, startAt: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Kết thúc</label>
              <input
                type="datetime-local"
                className="input-field"
                value={draftBlock.endAt}
                onChange={(event) => setDraftBlock((prev) => ({ ...prev, endAt: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ghi chú</label>
              <textarea
                rows={3}
                className="input-field resize-y"
                value={draftBlock.note}
                onChange={(event) => setDraftBlock((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Ví dụ: Thay dầu, kiểm tra định kỳ..."
              />
            </div>
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={createBlock}
              disabled={!selectedVehicleId || submitting}
            >
              {submitting ? 'Đang lưu...' : 'Tạo lịch bảo trì'}
            </button>
          </div>

          <div className="mt-4 space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">Chú thích</p>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
              Lịch bảo trì (chủ xe tạo)
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
              Đã được khách đặt
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
