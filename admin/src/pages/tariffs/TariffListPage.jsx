import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { buildRolePath } from "../../config/roleRoutes";
import { getTariffList } from "../../services/tariffZoneService";

function scopeLabel(scope) {
    return Number(scope) === 0 ? "Nội thành" : "Liên tỉnh";
}

function distUnitLabel(unit) {
    return Number(unit) === 0 ? "KM" : "Miles";
}

export default function TariffListPage() {
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
            const data = await getTariffList(query);
            setItems(data.items || []);
            setPagination((prev) => ({
                ...prev,
                page: Number(data.pagination?.page || prev.page),
                limit: Number(data.pagination?.limit || prev.limit),
                totalPages: Number(data.pagination?.totalPages || 0),
            }));
        } catch (error) {
            setItems([]);
            setErrorMessage(error?.response?.data?.message || "Không tải được danh sách cước phí.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [query]);

    return (
        <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col gap-4 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-4 py-5 text-white sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Tariffs</p>
                    <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                        Danh sách cước phí di chuyển
                    </h1>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={loadData}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                        <RefreshCw className="h-4 w-4" /> Tải lại
                    </button>
                    <Link
                        to={buildRolePath(role, "tariff/create")}
                        className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                        Tạo cước phí mới
                    </Link>
                </div>
            </div>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    setPagination((prev) => ({ ...prev, page: 1 }));
                    setAppliedSearch(search.trim());
                }}
                className="rounded-3xl border border-slate-200 bg-white p-3 sm:p-4"
            >
                <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Tìm theo tên cước phí"
                        className="min-h-11 flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 sm:min-w-28"
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
                    <div className="px-6 py-12 text-center text-sm text-slate-500">Chưa có cước phí nào.</div>
                ) : (
                    <div>
                        <div className="grid gap-3 p-3 sm:p-4 md:hidden">
                            {items.map((item) => (
                                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">#{item.id}</p>
                                            <h3 className="mt-1 text-base font-bold text-slate-900">{item.r_title}</h3>
                                        </div>
                                        <Link
                                            to={buildRolePath(role, `tariffs/${item.id}/edit`)}
                                            className="rounded-xl whitespace-nowrap border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                        >
                                            Chỉnh sửa
                                        </Link>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                                        <p className="text-slate-500">Phạm vi</p>
                                        <p className="font-medium text-slate-800">{scopeLabel(item.r_scope)}</p>
                                        <p className="text-slate-500">Đơn vị</p>
                                        <p className="font-medium text-slate-800">{distUnitLabel(item.dist_unit)}</p>
                                        <p className="text-slate-500">Tiền tệ</p>
                                        <p className="font-medium text-slate-800">
                                            {item.currency_name || "--"} {item.currency_symbol ? `(${item.currency_symbol})` : ""}
                                        </p>
                                        <p className="text-slate-500">Loại xe</p>
                                        <p className="font-medium text-slate-800">{item.vehicle_count}</p>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Tên cước phí</th>
                                        <th className="px-6 py-4">Phạm vi</th>
                                        <th className="px-6 py-4">Đơn vị</th>
                                        <th className="px-6 py-4">Tiền tệ</th>
                                        <th className="px-6 py-4">Số loại xe</th>
                                        <th className="px-6 py-4">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/80">
                                            <td className="px-6 py-4 text-sm text-slate-800">#{item.id}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.r_title}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{scopeLabel(item.r_scope)}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{distUnitLabel(item.dist_unit)}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{item.currency_name || "--"} {item.currency_symbol ? `(${item.currency_symbol})` : ""}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{item.vehicle_count}</td>
                                            <td className="px-6 py-4">
                                                <Link
                                                    to={buildRolePath(role, `tariffs/${item.id}/edit`)}
                                                    className="rounded-xl whitespace-nowrap border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                                >
                                                    Chỉnh sửa
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-slate-500">
                        Trang <span className="font-semibold text-slate-900">{pagination.page}</span> / {pagination.totalPages || 1}
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                            className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages}
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                            className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
