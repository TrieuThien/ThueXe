import { formatCurrency } from '../../../utils/format';

export default function RevenueByVehicleTable({ data, loading, onPageChange }) {
  const rows = data?.items || [];

  return (
    <section className="space-y-2">
      <h4 className="text-base font-bold text-slate-900">Doanh thu theo từng xe</h4>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Xe</th>
              <th className="px-3 py-2 font-semibold">Số đơn thuê</th>
              <th className="px-3 py-2 font-semibold">Tổng doanh thu</th>
              <th className="px-3 py-2 font-semibold">Doanh thu thuần</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  Đang tải dữ liệu doanh thu theo xe...
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  Chưa có dữ liệu doanh thu theo xe.
                </td>
              </tr>
            ) : null}
            {!loading &&
              rows.map((item) => (
                <tr key={item.vehicleId} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">
                    <p className="font-semibold text-slate-800">{item.vehicleName}</p>
                    <p className="text-xs text-slate-500">{item.plateNumber}</p>
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{item.totalBookings}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{formatCurrency(item.grossRevenue)}</td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">{formatCurrency(item.netRevenue)}</td>
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


