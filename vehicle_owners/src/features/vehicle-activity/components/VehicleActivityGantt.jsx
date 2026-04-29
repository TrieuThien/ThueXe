const BLOCK_STYLE = {
  booked: { bar: 'bg-sky-500', text: 'Đã đặt' },
  maintenance: { bar: 'bg-amber-500', text: 'Bảo trì' },
};

const STATUS_ROW_STYLE = {
  available: { bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', label: 'Đang hoạt động' },
  unavailable: { bg: 'bg-slate-100 border-slate-300', dot: 'bg-slate-400', label: 'Ngừng hoạt động' },
};

const legend = [
  { color: 'bg-sky-500', label: 'Đã có khách đặt' },
  { color: 'bg-amber-500', label: 'Bảo trì' },
  { color: 'bg-emerald-500', label: 'Đang hoạt động' },
  { color: 'bg-slate-400', label: 'Ngừng hoạt động' },
];

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function formatShortDate(date) {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatTooltip(block, from, to) {
  const start = new Date(block.startAt);
  const end = new Date(block.endAt);
  const clampedStart = start < from ? from : start;
  const clampedEnd = end > to ? to : end;
  const label = BLOCK_STYLE[block.type]?.text || block.type;
  const startStr = clampedStart.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const endStr = clampedEnd.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `${label}: ${startStr} → ${endStr}${block.note ? `\n${block.note}` : ''}`;
}

function buildTickMarks(from, to) {
  const totalMs = to.getTime() - from.getTime();
  const totalDays = totalMs / (1000 * 60 * 60 * 24);
  const ticks = [];

  if (totalDays <= 1) {
    for (let h = 0; h <= 24; h += 4) {
      const t = new Date(from.getTime() + h * 60 * 60 * 1000);
      if (t > to) break;
      const pct = ((t.getTime() - from.getTime()) / totalMs) * 100;
      ticks.push({ pct, label: t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) });
    }
  } else if (totalDays <= 14) {
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= to) {
      const pct = ((cursor.getTime() - from.getTime()) / totalMs) * 100;
      if (pct >= 0 && pct <= 100) ticks.push({ pct, label: formatShortDate(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const cursor = new Date(from);
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= to) {
      const pct = ((cursor.getTime() - from.getTime()) / totalMs) * 100;
      if (pct >= 0 && pct <= 100) ticks.push({ pct, label: cursor.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return ticks;
}

export default function VehicleActivityGantt({ timelineData, loading }) {
  const rawFrom = timelineData?.from;
  const rawTo = timelineData?.to;
  const from = rawFrom ? new Date(rawFrom) : new Date();
  const to = rawTo ? new Date(rawTo) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const totalMs = Math.max(1, to.getTime() - from.getTime());
  const rows = timelineData?.items || [];
  const ticks = buildTickMarks(from, to);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        {legend.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`inline-block h-3 w-3 rounded-sm ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="min-w-[860px] p-4">
          {loading ? <p className="text-sm text-slate-500">Đang tải dữ liệu...</p> : null}

          {!loading && rows.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có dữ liệu hoạt động xe.</p>
          ) : null}

          {!loading && rows.length > 0 ? (
            <div className="space-y-1">
              {/* Tick axis */}
              <div className="mb-2 grid grid-cols-[200px_1fr] gap-3">
                <div />
                <div className="relative h-5">
                  {ticks.map((tick) => (
                    <span
                      key={tick.pct}
                      className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400"
                      style={{ left: `${tick.pct}%` }}
                    >
                      {tick.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tick grid lines shared across all rows */}
              {rows.map((row) => {
                const rowStyle = STATUS_ROW_STYLE[row.status] || STATUS_ROW_STYLE.unavailable;
                const isUnavailable = row.status === 'unavailable';

                return (
                  <div key={row.vehicleId} className="grid grid-cols-[200px_1fr] gap-3 items-center">
                    {/* Vehicle label */}
                    <div className={`rounded-lg border px-3 py-2 ${rowStyle.bg}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${rowStyle.dot}`} />
                        <p className="truncate text-sm font-semibold text-slate-800">{row.plateNumber}</p>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{row.displayName}</p>
                      <p className={`mt-0.5 text-[10px] font-medium ${isUnavailable ? 'text-slate-500' : 'text-emerald-600'}`}>
                        {rowStyle.label}
                      </p>
                    </div>

                    {/* Timeline bar */}
                    <div className="relative h-12 overflow-hidden rounded-lg border border-slate-200">
                      {/* Tick grid lines */}
                      {ticks.map((tick) => (
                        <div
                          key={tick.pct}
                          className="absolute top-0 h-full w-px bg-slate-200"
                          style={{ left: `${tick.pct}%` }}
                        />
                      ))}

                      {/* Base fill: green when active, slate when stopped */}
                      <div
                        className={`absolute inset-0 ${isUnavailable ? 'bg-slate-200' : 'bg-emerald-50'}`}
                      />

                      {/* Occupied blocks */}
                      {row.blocks.map((block, idx) => {
                        const style = BLOCK_STYLE[block.type];
                        if (!style) return null;
                        const leftPct = clamp(((new Date(block.startAt).getTime() - from.getTime()) / totalMs) * 100);
                        const rightPct = clamp(((new Date(block.endAt).getTime() - from.getTime()) / totalMs) * 100);
                        const widthPct = Math.max(0.5, rightPct - leftPct);
                        return (
                          <div
                            key={`${block.type}-${block.id}-${idx}`}
                            className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center overflow-hidden ${style.bar}`}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            title={formatTooltip(block, from, to)}
                          >
                            <span className="truncate text-[10px] font-semibold text-white leading-none">
                              {style.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Bottom date range */}
          {!loading && rows.length > 0 ? (
            <div className="mt-3 flex justify-between text-[11px] text-slate-400">
              <span>{from.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span>{to.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
