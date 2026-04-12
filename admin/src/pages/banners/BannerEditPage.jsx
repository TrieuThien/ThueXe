import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { buildRolePath } from "../../config/roleRoutes";
import {
    getAdminBannerDetail,
    getBannerMeta,
    updateAdminBanner,
} from "../../services/bannerService";
import BannerForm from "./BannerForm";
import {
    buildBannerSubmitPayload,
    hasBannerErrors,
    hydrateBannerForm,
    validateBannerForm,
} from "./bannerFormUtils";

export default function BannerEditPage() {
    const { id } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const navigate = useNavigate();

    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        Promise.all([getBannerMeta(), getAdminBannerDetail(id)])
            .then(([meta, detail]) => {
                setCities(meta.cities || []);
                setForm(hydrateBannerForm(detail.banner));
            })
            .catch((error) => {
                setMessage(error?.response?.data?.message || "Không tải được dữ liệu chỉnh sửa.");
            })
            .finally(() => setLoading(false));
    }, [id]);

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
            await updateAdminBanner(id, payload);
            navigate(buildRolePath(role, "banners"));
        } catch (error) {
            setMessage(error?.response?.data?.message || "Không thể cập nhật banner.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading || !form) {
        return <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600">Đang tải dữ liệu chỉnh sửa...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-6 text-white">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Banners</p>
                <h1 className="mt-2 text-3xl font-bold">Chỉnh sửa banner #{id}</h1>
            </div>

            {message ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

            <BannerForm
                form={form}
                errors={errors}
                cities={cities}
                submitting={submitting}
                submitLabel="Lưu cập nhật"
                onChange={handleChange}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
