import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import {
    AlertCircle,
    ArrowLeft,
    BookmarkPlus,
    CreditCard,
    FileText,
    Loader2,
    PencilLine,
    RefreshCw,
    ShieldUser,
    Star,
} from "lucide-react";
import { getCustomerDetail } from "../../services/customerService";
import {
    buildBookingCreateDestination,
    buildBookingCreateState,
    buildBookingHistoryDestination,
    buildCustomerEditPath,
} from "./customerNavigation";

function formatDateTime(value) {
    if (!value) {
        return "--";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function formatMoney(amount, currencyCode = "VND") {
    const numericAmount = Number(amount || 0);

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currencyCode || "VND",
        maximumFractionDigits: 0,
    }).format(numericAmount);
}

function InfoItem({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{value || "--"}</p>
        </div>
    );
}

function TableSection({ icon: Icon, title, description, columns, rows, emptyText }) {
    return (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                        <p className="mt-1 text-sm text-slate-500">{description}</p>
                    </div>
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="px-6 py-10 text-sm text-slate-500">{emptyText}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                {columns.map((column) => (
                                    <th key={column.key} className="px-6 py-4">
                                        {column.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row) => (
                                <tr key={row.id} className="align-top">
                                    {columns.map((column) => (
                                        <td key={column.key} className="px-6 py-4 text-sm text-slate-700">
                                            {column.render(row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export default function CustomerDetail() {
    const { userId } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    async function loadDetail() {
        setLoading(true);
        setErrorMessage("");

        try {
            const data = await getCustomerDetail(userId);
            setDetail(data);
        } catch (error) {
            setErrorMessage(
                error?.response?.data?.message ||
                    "Không tải được chi tiết khách hàng. Vui lòng thử lại."
            );
            setDetail(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDetail();
    }, [userId]);

    const customer = detail?.customer;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 px-6 py-6 text-white lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">
                        Customer detail
                    </p>
                    <h1 className="mt-2 text-3xl font-bold">
                        {customer?.full_name || `Khách hàng #${userId}`}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">
                        Xem hồ sơ cá nhân cùng lịch sử giao dịch, đặt xe, đánh giá và tài liệu của
                        khách hàng trên một màn hình.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/admin/customers"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại danh sách
                    </Link>
                    {customer ? (
                        <>
                            <Link
                                to={buildCustomerEditPath(role, customer.user_id)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                            >
                                <PencilLine className="h-4 w-4" />
                                Sửa thông tin
                            </Link>
                            <Link
                                to={buildBookingCreateDestination(role, customer)}
                                state={buildBookingCreateState(customer)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                                <BookmarkPlus className="h-4 w-4" />
                                Đặt xe
                            </Link>
                            <Link
                                to={buildBookingHistoryDestination(role, customer)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Lịch sử đặt
                            </Link>
                        </>
                    ) : null}
                </div>
            </div>

            {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                </div>
            ) : null}

            {loading ? (
                <div className="flex min-h-72 items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-10 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Đang tải chi tiết khách hàng...</span>
                    </div>
                </div>
            ) : customer ? (
                <>
                    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <div className="flex flex-col gap-6 lg:flex-row">
                            <div className="flex w-full max-w-sm flex-col items-center rounded-[24px] bg-white p-5 text-center shadow-sm">
                                {customer.photo_file ? (
                                    <img
                                        src={customer.photo_file}
                                        alt={customer.full_name}
                                        className="h-28 w-28 rounded-[28px] object-cover"
                                    />
                                ) : (
                                    <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-slate-200 text-3xl font-bold text-slate-600">
                                        {customer.firstname?.[0] || "U"}
                                    </div>
                                )}
                                <h2 className="mt-4 text-xl font-bold text-slate-900">
                                    {customer.full_name}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">User #{customer.user_id}</p>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            Number(customer.account_active) === 1
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-rose-100 text-rose-700"
                                        }`}
                                    >
                                        {Number(customer.account_active) === 1
                                            ? "Đang hoạt động"
                                            : "Đang khóa"}
                                    </span>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            Number(customer.is_activated) === 1
                                                ? "bg-cyan-100 text-cyan-700"
                                                : "bg-amber-100 text-amber-700"
                                        }`}
                                    >
                                        {Number(customer.is_activated) === 1
                                            ? "Đã kích hoạt"
                                            : "Chưa kích hoạt"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        Thông tin cá nhân
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Dữ liệu hồ sơ cơ bản đang lưu trên hệ thống.
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <InfoItem label="Email" value={customer.email} />
                                    <InfoItem label="Số điện thoại" value={customer.phone} />
                                    <InfoItem label="Địa chỉ" value={customer.address} />
                                    <InfoItem label="Quốc gia" value={customer.country} />
                                    <InfoItem label="Mã quốc gia" value={customer.country_code} />
                                    <InfoItem
                                        label="Mã vùng điện thoại"
                                        value={customer.country_dial_code}
                                    />
                                    <InfoItem label="Khu vực" value={customer.route_name} />
                                    <InfoItem
                                        label="Số dư ví"
                                        value={formatMoney(customer.wallet_amount)}
                                    />
                                    <InfoItem
                                        label="Ngày tạo"
                                        value={formatDateTime(customer.account_create_date)}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <TableSection
                        icon={CreditCard}
                        title="Transactions"
                        description="Lịch sử giao dịch ví và các lần nạp ví liên quan đến khách hàng."
                        emptyText="Khách hàng chưa có giao dịch nào."
                        rows={detail?.transactions || []}
                        columns={[
                            {
                                key: "type",
                                header: "Loại",
                                render: (row) => (
                                    <div>
                                        <p className="font-semibold text-slate-900">{row.type_label}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {row.source_type === "wallet_fund"
                                                ? "wallet_fund"
                                                : row.reference_id || "--"}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "amount",
                                header: "Số tiền",
                                render: (row) => (
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {formatMoney(row.amount, row.currency_code)}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Số dư: {formatMoney(row.wallet_balance, row.currency_code)}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "detail",
                                header: "Chi tiết",
                                render: (row) => (
                                    <div>
                                        <p>{row.description || "--"}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Người thao tác: {row.actor_name || "--"}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "date",
                                header: "Thời gian",
                                render: (row) => formatDateTime(row.transaction_date),
                            },
                        ]}
                    />

                    <TableSection
                        icon={BookmarkPlus}
                        title="Booking"
                        description="Danh sách chuyến đi và trạng thái thanh toán của khách hàng."
                        emptyText="Khách hàng chưa có booking nào."
                        rows={detail?.bookings || []}
                        columns={[
                            {
                                key: "booking",
                                header: "Booking",
                                render: (row) => (
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            #{row.id} {row.booking_code ? `• ${row.booking_code}` : ""}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {row.status_label} • {row.payment_type_label}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "trip",
                                header: "Lộ trình",
                                render: (row) => (
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {row.pickup_address || "--"}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Đến: {row.dropoff_address || "--"}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "driver",
                                header: "Tài xế",
                                render: (row) => (
                                    <div>
                                        <p>{row.driver_name || "Chưa phân công"}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {row.driver_phone || "--"}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "amount",
                                header: "Chi phí",
                                render: (row) => (
                                    <div>
                                        <p>{formatMoney(row.actual_cost || row.estimated_cost)}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Đã trả: {formatMoney(row.paid_amount)}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "date",
                                header: "Tạo lúc",
                                render: (row) => formatDateTime(row.date_created),
                            },
                        ]}
                    />

                    <TableSection
                        icon={Star}
                        title="Reviews"
                        description="Các lượt khách hàng đánh giá tài xế hoặc được tài xế đánh giá."
                        emptyText="Khách hàng chưa có review nào."
                        rows={detail?.reviews || []}
                        columns={[
                            {
                                key: "direction",
                                header: "Loại",
                                render: (row) => (
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {row.direction_label}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Booking #{row.booking_id || "--"}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "counterparty",
                                header: "Đối tác",
                                render: (row) => row.counterparty_name || "--",
                            },
                            {
                                key: "rating",
                                header: "Điểm",
                                render: (row) => `${row.rating || 0}/5`,
                            },
                            {
                                key: "comment",
                                header: "Nội dung",
                                render: (row) => row.comment || "--",
                            },
                            {
                                key: "date",
                                header: "Ngày booking",
                                render: (row) => formatDateTime(row.booking_date),
                            },
                        ]}
                    />

                    <TableSection
                        icon={FileText}
                        title="Document"
                        description="Tài liệu hồ sơ khách hàng đã tải lên và trạng thái phê duyệt."
                        emptyText="Khách hàng chưa có tài liệu nào."
                        rows={detail?.documents || []}
                        columns={[
                            {
                                key: "title",
                                header: "Tài liệu",
                                render: (row) => (
                                    <div>
                                        <p className="font-semibold text-slate-900">{row.title || "--"}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {row.description || "--"}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "status",
                                header: "Trạng thái",
                                render: (row) => row.status_label,
                            },
                            {
                                key: "id_number",
                                header: "Mã định danh",
                                render: (row) =>
                                    row.id_number
                                        ? `${row.id_number_title || "Mã"}: ${row.id_number}`
                                        : "--",
                            },
                            {
                                key: "expiry",
                                header: "Hết hạn",
                                render: (row) => formatDateTime(row.expiry_date),
                            },
                            {
                                key: "updated",
                                header: "Cập nhật",
                                render: (row) => formatDateTime(row.date_updated),
                            },
                        ]}
                    />
                </>
            ) : (
                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <ShieldUser className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-sm text-slate-500">Không tìm thấy khách hàng này.</p>
                </div>
            )}
        </div>
    );
}
