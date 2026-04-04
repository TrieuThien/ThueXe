import { formatCurrency, formatDate } from '../../../utils/format';
const maintenanceStatusLabels = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang bảo trì',
  completed: 'Hoàn tất',
};

const statusClasses = {
  scheduled: 'border-amber-200 bg-amber-50 text-amber-700',
  in_progress: 'border-sky-200 bg-sky-50 text-sky-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export default function MaintenanceTable({
  data,
  loading,
  onOpenEdit,
  onDelete,
  onChangeStatus,
  statusUpdating,
  deleting,
  onPageChange,
}) {
  const rows = data?.items || [];

  return (
    <section className="space-y-2">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Xe</th>
              <th className="px-3 py-2 font-semibold">Mô tả</th>
              <th className="px-3 py-2 font-semibold">Bắt đầu</th>
              <th className="px-3 py-2 font-semibold">Kết thúc</th>
              <th className="px-3 py-2 font-semibold">Chi phí</th>
              <th className="px-3 py-2 font-semibold">Trạng thái</th>
              <th className="px-3 py-2 font-semibold">Cập nhật nhanh</th>
              <th className="px-3 py-2 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  Đang tải danh sách bảo trì...
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Chưa có phiếu bảo trì nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : null}
            {!loading &&
              rows.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">
                    <p className="font-semibold text-slate-800">{item.vehicle?.plateNumber || '--'}</p>
                    <p className="text-xs">{item.vehicle?.displayName || '--'}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{item.description}</td>
                  <td className="px-3 py-2 text-slate-700">{formatDate(item.startDate)}</td>
                  <td className="px-3 py-2 text-slate-700">{formatDate(item.endDate)}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{formatCurrency(item.cost)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        statusClasses[item.status]
                      }`}
                    >
                      {maintenanceStatusLabels[item.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="input-field max-w-[170px]"
                      value={item.status}
                      disabled={statusUpdating}
                      onChange={(event) =>
                        onChangeStatus(item.id, {
                          status: event.target.value,
                        })
                      }
                    >
                      <option value="scheduled">Đã lên lịch</option>
                      <option value="in_progress">Đang bảo trì</option>
                      <option value="completed">Hoàn tất</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" className="btn" onClick={() => onOpenEdit(item)}>
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="btn btn-Đanger"
                        onClick={() => onDelete(item.id)}
                        disabled={deleting}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          Trang {data?.page || 1}/{data?.totalPages || 1} - Tổng {data?.total || 0} phiếu
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => onPageChange(Math.max(1, (data?.page || 1) - 1))}
            disabled={(data?.page || 1) <= 1}
          >
            Trước
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onPageChange(Math.min(data?.totalPages || 1, (data?.page || 1) + 1))}
            disabled={(data?.page || 1) >= (data?.totalPages || 1)}
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  );
}



