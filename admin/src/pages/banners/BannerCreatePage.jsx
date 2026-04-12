import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { buildRolePath } from "../../config/roleRoutes";
import { createAdminBanner, getBannerMeta } from "../../services/bannerService";
import BannerForm from "./BannerForm";
import {
    buildBannerSubmitPayload,
    DEFAULT_BANNER_FORM,
    hasBannerErrors,
    validateBannerForm,
} from "./bannerFormUtils";

export default function BannerCreatePage() {
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const navigate = useNavigate();

    const [form, setForm] = useState(DEFAULT_BANNER_FORM);
    const [errors, setErrors] = useState({});
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        getBannerMeta()
            .then((data) => {
                setCities(data.cities || []);
            })
            .catch((error) => {
                setMessage(error?.response?.data?.message || "Không tải được dữ liệu form.");
            })
            .finally(() => setLoading(false));
    }, []);

    function handleChange(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const nextErrors = validateBannerForm(form);
        setErrors(nextErrors);

        if (hasBannerErrors(nextErrors)) {
            setMessage("Vui lòng kiểm tra lại thông tin trước khi lưu.");
            return;
        }

        setSubmitting(true);
        setMessage("");

        try {
            const payload = buildBannerSubmitPayload(form);
            await createAdminBanner(payload);
            navigate(buildRolePath(role, "banners"));
        } catch (error) {
            setMessage(error?.response?.data?.message || "Không thể tạo banner.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600">Đang tải dữ liệu form...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-6 text-white md:flex-row md:items-center">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Banners</p>
                    <h1 className="mt-2 text-3xl font-bold">Tạo banner mobile mới</h1>
                    <p className="mt-2 text-sm text-slate-200">Banner này sẽ hiển thị theo khu vực và visibility bạn đã chọn.</p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate(buildRolePath(role, "banners"))}
                    className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                >
                    Quay lại quản lý banner
                </button>
            </div>

            {message ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

            <BannerForm
                form={form}
                errors={errors}
                cities={cities}
                submitting={submitting}
                submitLabel="Tạo banner"
                onChange={handleChange}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
