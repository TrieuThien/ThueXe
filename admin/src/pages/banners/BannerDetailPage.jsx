import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { buildRolePath } from "../../config/roleRoutes";
import { getAdminBannerDetail } from "../../services/bannerService";
import {
    formatDateTime,
    getBannerStatusBadge,
    getBannerVisibilityBadge,
} from "./bannerFormUtils";

export default function BannerDetailPage() {
    const { id } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";

    const [banner, setBanner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        getAdminBannerDetail(id)
            .then((data) => {
                setBanner(data.banner || null);
            })
            .catch((error) => {
                setErrorMessage(error?.response?.data?.message || "Không tải được chi tiết banner.");
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600">Đang tải dữ liệu chi tiết...</div>;
    }

    if (errorMessage || !banner) {
        return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage || "Không tìm thấy banner."}</p>;
    }

    const statusBadge = getBannerStatusBadge(banner);
    const visibilityBadge = getBannerVisibilityBadge(banner);

    return (
        <div className="space-y-6">
            <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-6 text-white">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Banners</p>
                <h1 className="mt-2 text-3xl font-bold">Chi tiết banner #{banner.id}</h1>
                <div className="mt-4 flex flex-wrap gap-2">
                    {[statusBadge, visibilityBadge].map((badge) => (
                        <span
                            key={badge.label}
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                        >
                            {badge.label}
                        </span>
                    ))}
                </div>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <p><span className="font-semibold text-slate-700">Ảnh banner:</span></p>
                        {banner.feature_img ? (
                            <img
                                src={banner.feature_img}
                                alt={banner.title || "banner"}
                                className="mt-2 h-56 w-full max-w-2xl rounded-2xl border border-slate-200 object-cover"
                                onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                }}
                            />
                        ) : (
                            <p className="mt-2 text-sm text-slate-500">--</p>
                        )}
                    </div>
                    <p><span className="font-semibold text-slate-700">Tiêu đề:</span> {banner.title || "--"}</p>
                    <p><span className="font-semibold text-slate-700">Khu vực:</span> {Number(banner.city) === 0 ? "Toàn hệ thống" : (banner.city_name || `#${banner.city}`)}</p>
                    <p><span className="font-semibold text-slate-700">Mô tả:</span> {banner.excerpt || "--"}</p>
                    <p><span className="font-semibold text-slate-700">Ảnh nổi bật:</span> {banner.feature_img || "--"}</p>
                    <p className="md:col-span-2"><span className="font-semibold text-slate-700">Nội dung:</span> {banner.content || "--"}</p>
                    <p><span className="font-semibold text-slate-700">Ngày tạo:</span> {formatDateTime(banner.date_created)}</p>
                </div>
            </section>

            <div className="flex gap-3">
                <Link
                    to={buildRolePath(role, "banners")}
                    className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Quay lại danh sách
                </Link>
                <Link
                    to={buildRolePath(role, `banners/${banner.id}/edit`)}
                    className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                    Chỉnh sửa
                </Link>
            </div>
        </div>
    );
}
