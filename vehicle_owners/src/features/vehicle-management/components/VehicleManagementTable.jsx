import { formatDate } from '../../../utils/format';

const usageStatusBadge = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rented: 'border-sky-200 bg-sky-50 text-sky-700',
  maintenance: 'border-amber-200 bg-amber-50 text-amber-700',
  unavailable: 'border-slate-200 bg-slate-50 text-slate-700',
};

const verificationBadge = {
  pending_review: 'border-amber-200 bg-amber-50 text-amber-700',
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  missing_documents: 'border-rose-200 bg-rose-50 text-rose-700',
};

const usageLabels = {
  available: 'Khả dụng',
  rented: 'Đang cho thuê',
  maintenance: 'Bảo trì',
  unavailable: 'Không khả dụng',
};

const verifyLabels = {
  pending_review: 'Chờ duyệt',
  verified: 'Đã xác minh',
  missing_documents: 'Thiếu giấy tờ',
};

export default function VehicleManagementTable({
  data,
  query,
  onSearchChange,
  onStatusChange,
  onPageChange,
  onOpenDetail,
  onOpenDocumentModal,
  loading,
}) {
  const rows = data?.items || [];

  return (
    <section className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[1fr_220px]">
        <input
          className="input-field"
          value={query.search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo Biển số, hãng, model..."
        />
        <select className="input-field" value={query.status} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="all">Tất cả trạng thái sử dụng</option>
          <option value="available">Khả dụng</option>
          <option value="rented">Đã cho thuê</option>
          <option value="maintenance">Bảo trì</option>
          <option value="unavailable">Không khả dụng</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Biển số</th>
              <th className="px-3 py-2 font-semibold">Loại xe</th>
              <th className="px-3 py-2 font-semibold">Trạng thái sử dụng</th>
              <th className="px-3 py-2 font-semibold">Trạng thái xác minh</th>
              <th className="px-3 py-2 font-semibold">Ngày thêm</th>
              <th className="px-3 py-2 font-semibold">Hồ sơ</th>
              <th className="px-3 py-2 font-semibold">Thao tác</th>
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
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  Chưa có xe nào. Hãy đăng ký xe mới để bắt đầu.
                </td>
              </tr>
            ) : null}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-800">{row.plateNumber}</td>
                  <td className="px-3 py-2 text-slate-700">{row.vehicleType}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${usageStatusBadge[row.usageStatus]}`}
                    >
                      {usageLabels[row.usageStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${verificationBadge[row.verificationStatus]}`}
                    >
                      {verifyLabels[row.verificationStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{formatDate(row.addedAt)}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.missingDocumentCount > 0 ? (
                      <span className="font-semibold text-rose-600">Thiếu {row.missingDocumentCount} giấy tờ</span>
                    ) : (
                      <span className="font-semibold text-emerald-600">đầy đủ</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn" onClick={() => onOpenDetail(row.id)}>
                        chi tiết
                      </button>
                      <button type="button" className="btn" onClick={() => onOpenDocumentModal(row.id)}>
                        Cập nhật giấy tờ
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
          Trang {data?.page || 1}/{data?.totalPages || 1} - Tổng {data?.total || 0} xe
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


