const statusBadgeClasses = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  unavailable: 'border-slate-200 bg-slate-50 text-slate-700',
};

const verifyBadgeClasses = {
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
};

const readableStatus = {
  available: 'Đang hoạt động',
  unavailable: 'Ngừng hoạt động',
};

const readableVerify = {
  verified: 'Đã xác minh',
  pending: 'Chờ xác minh',
  rejected: 'Bị từ chối',
};

export default function VehicleListTable({
  data,
  query,
  onSearchChange,
  onStatusChange,
  onPageChange,
  onToggleStatus,
  togglingVehicleId,
  loading,
}) {
  const rows = data?.items || [];
  const hasData = rows.length > 0;

  return (
    <section className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[1fr_220px]">
        <input
          className="input-field"
          value={query.search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo Biển số, hãng xe, model..."
        />
        <select className="input-field" value={query.status} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="all">Tất cả Trạng thái</option>
          <option value="available">Đang hoạt động</option>
          <option value="unavailable">Ngừng hoạt động</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Biển số</th>
              <th className="px-3 py-2 font-semibold">Loại xe</th>
              <th className="px-3 py-2 font-semibold">Hãng / Model / Năm</th>
              <th className="px-3 py-2 font-semibold">Trạng thái</th>
              <th className="px-3 py-2 font-semibold">Xác minh</th>
              <th className="px-3 py-2 font-semibold">Vị trí</th>
              <th className="px-3 py-2 font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  Đang tải danh sách xe...
                </td>
              </tr>
            ) : null}
            {!loading && !hasData ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                  Chưa có xe nào. Hãy thêm xe để bắt đầu Quản lý hoạt động.
                </td>
              </tr>
            ) : null}
            {!loading &&
              hasData &&
              rows.map((row) => {
                const isToggling = togglingVehicleId === row.id;
                const isVerified = row.verificationStatus === 'verified';
                const isActive = row.status === 'available';
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">{row.plateNumber}</td>
                    <td className="px-3 py-2 text-slate-700">{row.vehicleType}</td>
                    <td className="px-3 py-2 text-slate-700">{`${row.brand} ${row.model} ${row.year}`}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses[row.status] || statusBadgeClasses.unavailable}`}
                      >
                        {readableStatus[row.status] || row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${verifyBadgeClasses[row.verificationStatus] || verifyBadgeClasses.pending}`}
                      >
                        {readableVerify[row.verificationStatus] || row.verificationStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.location?.label || 'Không có dữ liệu'}</td>
                    <td className="px-3 py-2">
                      {isVerified ? (
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => onToggleStatus(row.id)}
                          className={`rounded-lg border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                            isActive
                              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {isToggling ? 'Đang xử lý...' : isActive ? 'Dừng hoạt động' : 'Bật lại'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Chờ xác minh</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-500">
          Trang {data?.page || 1}/{data?.totalPages || 1} - Tổng {data?.total || 0} xe
        </p>
        <div className="flex items-center gap-2">
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
