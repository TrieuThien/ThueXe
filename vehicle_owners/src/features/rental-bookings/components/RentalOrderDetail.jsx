import { formatCurrency, formatDateTime } from '../../../utils/format';
import {
  RENTAL_ORDER_STATUS_BADGES,
  RENTAL_ORDER_STATUS_LABELS,
  RENTAL_PAYMENT_STATUS_BADGES,
  RENTAL_PAYMENT_STATUS_LABELS,
  RENTAL_SERVICE_TYPE_LABELS,
} from '../constants';
import StatusUpdateAction from './StatusUpdateAction';
import ContractList from './ContractList';

export default function RentalOrderDetail({
  booking,
  loading,
  contracts,
  contractsLoading,
  onStatusUpdate,
  onViewContractDetail,
  statusUpdating,
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Đang tải chi tiết đơn thuê
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Không tìm thấy đơn thuê.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wiđể text-slate-500">Mã đơn</p>
            <h3 className="text-lg font-bold text-slate-900">{booking.orderCode}</h3>
          </div>
          <div className="flex gap-2">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${RENTAL_PAYMENT_STATUS_BADGES[booking.paymentStatus]}`}
            >
              {RENTAL_PAYMENT_STATUS_LABELS[booking.paymentStatus]}
            </span>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${RENTAL_ORDER_STATUS_BADGES[booking.orderStatus]}`}
            >
              {RENTAL_ORDER_STATUS_LABELS[booking.orderStatus]}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wiđể text-slate-500">Thông tin khách hàng</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{booking.customer.fullName}</p>
            <p className="text-sm text-slate-700">{booking.customer.phoneNumber}</p>
            <p className="text-sm text-slate-700">{booking.customer.email}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wiđể text-slate-500">Thông tin xe</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{booking.vehicle.displayName}</p>
            <p className="text-sm text-slate-700">{booking.vehicle.plateNumber}</p>
            <p className="text-sm text-slate-700">{booking.vehicle.type}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wiđể text-slate-500">Gói thuê</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{booking.servicePackage.name}</p>
            <p className="text-sm text-slate-700">{RENTAL_SERVICE_TYPE_LABELS[booking.servicePackage.serviceType]}</p>
            <p className="text-sm text-slate-700">Hạn mục: {booking.servicePackage.includedDistanceKm} km</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wiđể text-slate-500">Điểm giao xe</p>
            <p className="mt-1 text-sm text-slate-700">{booking.pickup.address}</p>
            <p className="text-sm text-slate-700">{formatDateTime(booking.pickup.at)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wiđể text-slate-500">Điểm trả xe</p>
            <p className="mt-1 text-sm text-slate-700">{booking.dropoff.address != null ? booking.dropoff.address : booking.pickup.address}</p>
            <p className="text-sm text-slate-700">{formatDateTime(booking.dropoff.at)}</p>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="text-base font-bold text-slate-900">Chi phi chi tiết</h4>
        <div className="mt-3 grid gap-2 text-sm">
          {booking.paymentMethod ? (
            <p className="flex justify-between text-slate-600">
              <span>Phương thức thanh toán</span>
              <span className="font-semibold">{booking.paymentMethod}</span>
            </p>
          ) : null}
          <p className="flex justify-between">
            <span>Giá thuê cơ bản</span>
            <span className="font-semibold">{formatCurrency(booking.costBreakdown.basePrice)}</span>
          </p>
          <p className="flex justify-between text-slate-500">
            <span>Tiền cọc (đã thanh toán riêng)</span>
            <span className="font-semibold">{formatCurrency(booking.costBreakdown.depositAmount)}</span>
          </p>
          <p className="flex justify-between">
            <span>Phí giao xe</span>
            <span className="font-semibold">{formatCurrency(booking.costBreakdown.deliveryFee)}</span>
          </p>
          <p className="flex justify-between">
            <span>Giảm giá</span>
            <span className="font-semibold">- {formatCurrency(booking.costBreakdown.discount)}</span>
          </p>
          <p className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <span>Tổng tiền (chưa tính cọc)</span>
            <span>{formatCurrency(booking.costBreakdown.totalAmount)}</span>
          </p>
          {booking.cancelNote ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Ghi chú hủy: {booking.cancelNote}
            </p>
          ) : null}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="text-base font-bold text-slate-900">Timeline trạng thái đơn</h4>
        <div className="mt-3 space-y-2">
          {booking.statusHistory.map((history, idx) => (
            <div key={`${history.status}-${history.at}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-800">{RENTAL_ORDER_STATUS_LABELS[history.status]}</p>
              <p className="text-xs text-slate-500">{formatDateTime(history.at)}</p>
              {history.note ? <p className="mt-1 text-sm text-slate-600">{history.note}</p> : null}
            </div>
          ))}
        </div>
      </article>

      <StatusUpdateAction booking={booking} loading={statusUpdating} onSubmit={onStatusUpdate} />

      <ContractList contracts={contracts} loading={contractsLoading} onViewDetail={onViewContractDetail} />
    </section>
  );
}


