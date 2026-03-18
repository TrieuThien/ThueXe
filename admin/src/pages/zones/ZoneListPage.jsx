import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { buildRolePath } from "../../config/roleRoutes";
import { getZoneList } from "../../services/tariffZoneService";

function fareTypeLabel(value) {
    return Number(value) === 1 ? "Nhân hệ số" : "Cộng thêm tiền";
}

function formatDate(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export default function ZoneListPage() {
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";

    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const query = useMemo(
        () => ({ page: pagination.page, limit: pagination.limit, search: appliedSearch }),
        [appliedSearch, pagination.limit, pagination.page]
    );

    async function loadData() {
        setLoading(true);
        setErrorMessage("");

        try {
            const data = await getZoneList(query);
            setItems(data.items || []);
            setPagination((prev) => ({
                ...prev,
                page: Number(data.pagination?.page || prev.page),
                limit: Number(data.pagination?.limit || prev.limit),
                totalPages: Number(data.pagination?.totalPages || 0),
            }));
        } catch (error) {
            setItems([]);
            setErrorMessage(error?.response?.data?.message || "Không tải được danh sách vùng.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [query]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Zones</p>
                    <h1 className="mt-2 text-3xl font-bold">Danh sách vùng</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={loadData}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                    >
                        <RefreshCw className="h-4 w-4" /> Tải lại
                    </button>
                    <Link
                        to={buildRolePath(role, "area/create")}
                        className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                    >
                        Tạo vùng mới
                    </Link>
                </div>
            </div>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    setPagination((prev) => ({ ...prev, page: 1 }));
                    setAppliedSearch(search.trim());
                }}
                className="rounded-3xl border border-slate-200 bg-white p-4"
            >
                <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Tìm theo tên vùng"
                        className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
                    />
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                        <Search className="h-4 w-4" /> Tìm
                    </button>
                </div>
            </form>

            {errorMessage ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                {loading ? (
                    <div className="flex min-h-56 items-center justify-center text-slate-600">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải dữ liệu...
                    </div>
                ) : items.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-500">Chưa có vùng nào.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Tên vùng</th>
                                    <th className="px-6 py-4">Thành phố</th>
                                    <th className="px-6 py-4">Kiểu tăng giá</th>
                                    <th className="px-6 py-4">Giá trị</th>
                                    <th className="px-6 py-4">Ngày tạo</th>
                                    <th className="px-6 py-4">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 text-sm text-slate-800">#{item.id}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.title}</td>
                                        <td className="px-6 py-4 text-sm text-slate-700">{item.city_route_title || item.city_id}</td>
                                        <td className="px-6 py-4 text-sm text-slate-700">{fareTypeLabel(item.zone_fare_type)}</td>
                                        <td className="px-6 py-4 text-sm text-slate-700">{item.zone_fare_value}</td>
                                        <td className="px-6 py-4 text-sm text-slate-700">{formatDate(item.zone_create_date)}</td>
                                        <td className="px-6 py-4">
                                            <Link
                                                to={buildRolePath(role, `areas/${item.id}/edit`)}
                                                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                            >
                                                Chỉnh sửa
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm">
                    <p className="text-slate-500">
                        Trang <span className="font-semibold text-slate-900">{pagination.page}</span> / {pagination.totalPages || 1}
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages}
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
