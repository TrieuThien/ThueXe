import { Link } from 'react-router-dom';
import { OWNER_ROUTES } from '../../../constants/routes';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import {
  RENTAL_ORDER_STATUS_BADGES,
  RENTAL_ORDER_STATUS_LABELS,
  RENTAL_PAYMENT_STATUS_BADGES,
  RENTAL_PAYMENT_STATUS_LABELS,
  RENTAL_SERVICE_TYPE_LABELS,
} from '../constants';

export default function RentalOrderTable({ data, loading, onQuickView, onPageChange }) {
  const rows = data?.items || [];

  return (
    <section className="space-y-2">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Mã đơn thuê</th>
              <th className="px-3 py-2 font-semibold">Khách hàng</th>
              <th className="px-3 py-2 font-semibold">Xe</th>
              <th className="px-3 py-2 font-semibold">Gói thuê</th>
              <th className="px-3 py-2 font-semibold">Bắt đầu / Kết thúc</th>
              <th className="px-3 py-2 font-semibold">Tổng tiền</th>
              <th className="px-3 py-2 font-semibold">Thanh toán</th>
              <th className="px-3 py-2 font-semibold">Trạng thái đơn</th>
              <th className="px-3 py-2 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                  Đang tải danh sách đơn thuê...
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  Không có đơn thuê phù hợp với bộ lọc.
                </td>
              </tr>
            ) : null}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-800">{row.orderCode}</td>
                  <td className="px-3 py-2 text-slate-700">{row.customerName}</td>
                  <td className="px-3 py-2 text-slate-700">
                    <p>{row.vehicleName}</p>
                    <p className="text-xs text-slate-500">{row.plateNumber}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <p>{row.servicePackageName}</p>
                    <p className="text-xs text-slate-500">{RENTAL_SERVICE_TYPE_LABELS[row.serviceType]}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <p>{formatDateTime(row.startAt)}</p>
                    <p>{formatDateTime(row.endAt)}</p>
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{formatCurrency(row.totalAmount)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${RENTAL_PAYMENT_STATUS_BADGES[row.paymentStatus]}`}
                    >
                      {RENTAL_PAYMENT_STATUS_LABELS[row.paymentStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${RENTAL_ORDER_STATUS_BADGES[row.orderStatus]}`}
                    >
                      {RENTAL_ORDER_STATUS_LABELS[row.orderStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn" onClick={() => onQuickView(row.id)}>
                        Xem nhanh
                      </button>
                      <Link className="btn" to={`${OWNER_ROUTES.BOOKINGS}/${row.id}`}>
                        Chi tiết
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          Trang {data?.page || 1}/{data?.totalPages || 1} - Tổng {data?.total || 0} đơn
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


