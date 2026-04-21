import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { buildRolePath } from "../../config/roleRoutes";
import {
  getAdminBanners,
  getBannerMeta,
  updateAdminBannerStatus,
} from "../../services/bannerService";
import {
  getBannerStatusBadge,
  getBannerVisibilityBadge,
} from "./bannerFormUtils";

export default function BannerListPage() {
  const outletContext = useOutletContext();
  const role = outletContext?.role || "admin";
  const navigate = useNavigate();

  const [cities, setCities] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    city: "",
    visibility: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const query = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      search: filters.search,
      status: filters.status,
      city: filters.city,
      visibility: filters.visibility,
    }),
    [filters, pagination.limit, pagination.page]
  );

  async function loadMeta() {
    try {
      const meta = await getBannerMeta();
      setCities(meta.cities || []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không tải được dữ liệu khu vực.");
    }
  }

  async function loadBanners() {
    setLoading(true);
    setErrorMessage("");

    try {
      const data = await getAdminBanners(query);
      setItems(data.items || []);
      setPagination((prev) => ({
        ...prev,
        page: Number(data.pagination?.page || prev.page),
        limit: Number(data.pagination?.limit || prev.limit),
        totalPages: Number(data.pagination?.totalPages || 0),
      }));
    } catch (error) {
      setItems([]);
      setErrorMessage(error?.response?.data?.message || "Không tải được danh sách banner.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadBanners();
  }, [query]);

  async function handleToggleStatus(banner) {
    const nextStatus = Number(banner.status) === 1 ? 0 : 1;
    setActionLoadingId(banner.id);

    try {
      await updateAdminBannerStatus(banner.id, nextStatus);
      await loadBanners();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Không thể cập nhật trạng thái banner.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-4 py-6 text-white shadow-lg shadow-slate-900/20 sm:px-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-400/20 blur-2xl" />
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-blue-200">Banners</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">Quản lý banner di động</h1>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
          <button
            type="button"
            onClick={loadBanners}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" /> Tải lại
          </button>
          <Link
            to={buildRolePath(role, "banners/create")}
            className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Tạo banner mới
          </Link>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPagination((prev) => ({ ...prev, page: 1 }));
          setFilters((prev) => ({ ...prev, search: searchInput.trim() }));
        }}
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label htmlFor="search" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tìm kiếm
            </label>
            <input
              type="text"
              id="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tiêu đề hoặc nội dung"
              className="min-h-11 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="status" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trang thái  
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(event) => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                setFilters((prev) => ({ ...prev, status: event.target.value }));
              }}
              className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="1">Đang hiển thị</option>
              <option value="0">Đang ẩn</option>
            </select>
          </div>

          <div>
            <label htmlFor="city" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Khu vực
            </label>
            <select
              id="city"
              value={filters.city}
              onChange={(event) => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                setFilters((prev) => ({ ...prev, city: event.target.value }));
              }}
              className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Tất cả khu vực</option>
              <option value="0">Toàn hệ thống</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.r_title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="visibility" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nền tảng hiển thị
            </label>
            <select
              id="visibility"
              value={filters.visibility}
              onChange={(event) => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                setFilters((prev) => ({ ...prev, visibility: event.target.value }));
              }}
              className="min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Tất cả nền tảng</option>
              <option value="0">Rider + Driver</option>
              <option value="1">Rider app</option>
              <option value="2">Driver app</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Search className="h-4 w-4" /> Tìm kiếm
          </button>
        </div>
      </form>

      {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-56 items-center justify-center text-slate-600">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải dữ liệu...
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">Chưa có banner nào.</div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {items.map((item) => {
                const statusBadge = getBannerStatusBadge(item);
                const visibilityBadge = getBannerVisibilityBadge(item);

                return (
                  <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    {item.feature_img ? (
                      <img
                        src={item.feature_img}
                        alt={item.title || "banner"}
                        className="mb-3 h-32 w-full rounded-xl border border-slate-200 object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <p className="text-sm font-semibold text-slate-900">#{item.id} - {item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.excerpt}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[statusBadge, visibilityBadge].map((badge) => (
                        <span
                          key={`${item.id}-${badge.label}`}
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      <p>Khu vực: {Number(item.city) === 0 ? "Toàn hệ thống" : (item.city_name || `#${item.city}`)}</p>
                      <p>Ngày tạo: {item.date_created ? new Date(item.date_created).toLocaleString("vi-VN") : "--"}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(buildRolePath(role, `banners/${item.id}`))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(buildRolePath(role, `banners/${item.id}/edit`))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        disabled={actionLoadingId === item.id}
                        onClick={() => handleToggleStatus(item)}
                        className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                      >
                        {actionLoadingId === item.id ? "Đang cập nhật..." : Number(item.status) === 1 ? "Ẩn banner" : "Hiển thị banner"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Tiêu đề</th>
                    <th className="px-6 py-4">Khu vực</th>
                    <th className="px-6 py-4">Badge</th>
                    <th className="px-6 py-4">Ngày tạo</th>
                    <th className="px-6 py-4">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const statusBadge = getBannerStatusBadge(item);
                    const visibilityBadge = getBannerVisibilityBadge(item);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">#{item.id}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {item.feature_img ? (
                            <img
                              src={item.feature_img}
                              alt={item.title || "banner"}
                              className="mb-2 h-14 w-24 rounded-lg border border-slate-200 object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null}
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.excerpt}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {Number(item.city) === 0 ? "Toan he thong" : (item.city_name || `#${item.city}`)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {[statusBadge, visibilityBadge].map((badge) => (
                              <span
                                key={`${item.id}-${badge.label}`}
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {item.date_created ? new Date(item.date_created).toLocaleString("vi-VN") : "--"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(buildRolePath(role, `banners/${item.id}`))}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(buildRolePath(role, `banners/${item.id}/edit`))}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === item.id}
                              onClick={() => handleToggleStatus(item)}
                              className="rounded-xl border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                            >
                              {actionLoadingId === item.id ? "Đang cập nhật..." : Number(item.status) === 1 ? "Ẩn banner" : "Hiển thị banner"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
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
