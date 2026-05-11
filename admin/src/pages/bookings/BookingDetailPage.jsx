import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { getBookingDetail } from "../../services/bookingService";
import { getStatusLabel } from "../../types/bookingTypes";
import { formatCurrency } from "../../utils/formatUtils";

function formatDateTime(value) {
    if (!value) return "--";

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

export default function BookingDetailPage() {
    const { bookingId } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        let active = true;

        async function loadDetail() {
            setLoading(true);
            setErrorMessage("");
            try {
                const data = await getBookingDetail(bookingId);
                if (active) {
                    setDetail(data);
                }
            } catch (error) {
                if (active) {
                    setErrorMessage(error?.response?.data?.message || "Failed to load booking detail.");
                    setDetail(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadDetail();

        return () => {
            active = false;
        };
    }, [bookingId]);

    const booking = detail?.booking;

    return (
        <div className="space-y-5">
            <section className="rounded-[24px] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 px-6 py-6 text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Chi tiết chuyến đi</p>
                <h1 className="mt-2 text-3xl font-bold">Chuyến đi #{bookingId}</h1>
                <p className="mt-2 text-sm text-slate-200">Hoàn thành và điều phối chuyến đi với vài trò {role}.</p>
            </section>

            {loading ? (
                <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                    Loading booking detail...
                </div>
            ) : null}

            {errorMessage ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                </div>
            ) : null}

            {!loading && booking ? (
                <>
                    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900">Thông tin chuyến đi</h2>
                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tình trạng</p>
                                <p className="mt-1 font-semibold text-slate-900">{booking.status_label || getStatusLabel(booking.status)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Điểm đón</p>
                                <p className="mt-1 font-semibold text-slate-900">{booking.pickup_address}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Điểm trả</p>
                                <p className="mt-1 font-semibold text-slate-900">{booking.dropoff_address}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lên lịch</p>
                                <p className="mt-1 font-semibold text-slate-900">{Number(booking.scheduled) === 1 ? "Có" : "Không"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Giá ước tính</p>
                                <p className="mt-1 font-semibold text-slate-900">{formatCurrency(booking.estimated_cost)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Giá thực tế</p>
                                <p className="mt-1 font-semibold text-slate-900">{formatCurrency(booking.actual_cost)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ngày tạo</p>
                                <p className="mt-1 font-semibold text-slate-900">{formatDateTime(booking.date_created)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hoàn thành</p>
                                <p className="mt-1 font-semibold text-slate-900">{formatDateTime(booking.date_completed)}</p>
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900">Hành khách</h3>
                            <p className="mt-2 text-sm text-slate-700">{detail.user?.full_name || "--"}</p>
                            <p className="text-sm text-slate-500">{detail.user?.phone || "--"}</p>
                            <p className="text-sm text-slate-500">{detail.user?.email || "--"}</p>
                        </article>

                        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900">Tài xế</h3>
                            <p className="mt-2 text-sm text-slate-700">{detail.driver?.full_name || "Chưa gán tài xế"}</p>
                            <p className="text-sm text-slate-500">{detail.driver?.phone || "--"}</p>
                            <p className="text-sm text-slate-500">Vị trí: {detail.driver_location ? `${detail.driver_location.lat}, ${detail.driver_location.long}` : "--"}</p>
                        </article>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-base font-bold text-slate-900">Lịch sử phân công tài xế</h3>
                        {(detail.allocations || []).length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500">Không có bản ghi phân công.</p>
                        ) : (
                            <div className="mt-3 overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">Id</th>
                                            <th className="px-3 py-2">Tài xế</th>
                                            <th className="px-3 py-2">Tình trạng</th>
                                            <th className="px-3 py-2">Phân công</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {detail.allocations.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-3 py-2">{item.id}</td>
                                                <td className="px-3 py-2">{item.driver_name || `Driver #${item.driver_id}`}</td>
                                                <td className="px-3 py-2">{item.status}</td>
                                                <td className="px-3 py-2">{formatDateTime(item.date_allocated)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            ) : null}
        </div>
    );
}
