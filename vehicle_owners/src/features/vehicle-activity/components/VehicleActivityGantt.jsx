const blockStyles = {
  booked: 'bg-sky-500',
  maintenance: 'bg-amber-500',
  available: 'bg-emerald-500',
  unavailable: 'bg-slate-500',
};

const legend = [
  { type: 'booked', label: 'Đã đặt' },
  { type: 'maintenance', label: 'Bảo trì' },
  { type: 'available', label: 'Khả dụng' },
  { type: 'unavailable', label: 'Không khả dụng' },
];

const clampPercent = (value) => Math.max(0, Math.min(100, value));

export default function VehicleActivityGantt({ timelineData, loading }) {
  const from = new Date(timelineData?.from || Date.now());
  const to = new Date(timelineData?.to || Date.now() + 1);
  const totalMs = Math.max(1, to.getTime() - from.getTime());
  const rows = timelineData?.items || [];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {legend.map((item) => (
          <p key={item.type} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${blockStyles[item.type]}`} />
            {item.label}
          </p>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="min-w-[980px] p-3">
          <div className="mb-3 flex justify-between text-xs font-semibold text-slate-500">
            <span>{from.toLocaleDateString('vi-VN')}</span>
            <span>{to.toLocaleDateString('vi-VN')}</span>
          </div>

          {loading ? <p className="text-sm text-slate-500">Đang tải dữ liệu...</p> : null}
          {!loading && rows.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có dữ liệu hoạt động xe.</p>
          ) : null}

          {!loading && rows.length > 0 ? (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.vehicleId} className="grid grid-cols-[220px_1fr] gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-800">{row.plateNumber}</p>
                    <p className="text-xs text-slate-500">{row.displayName}</p>
                  </div>
                  <div className="relative h-14 rounded-lg border border-slate-200 bg-slate-50">
                    {row.blocks.map((block) => {
                      const leftPercent =
                        ((new Date(block.startAt).getTime() - from.getTime()) / totalMs) * 100;
                      const rightPercent =
                        ((new Date(block.endAt).getTime() - from.getTime()) / totalMs) * 100;
                      const widthPercent = Math.max(1, rightPercent - leftPercent);
                      return (
                        <div
                          key={block.id}
                          className={`absolute top-2 h-10 rounded-md px-2 py-1 text-[11px] font-semibold text-white ${blockStyles[block.type] || blockStyles.unavailable}`}
                          style={{
                            left: `${clampPercent(leftPercent)}%`,
                            width: `${clampPercent(widthPercent)}%`,
                          }}
                          title={`${block.type}: ${new Date(block.startAt).toLocaleString('vi-VN')} -> ${new Date(block.endAt).toLocaleString('vi-VN')}`}
                        >
                          {block.type}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}


