import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { buildRolePath } from "../../config/roleRoutes";
import {
    getAdminBannerDetail,
    getBannerMeta,
    updateAdminBanner,
} from "../../services/bannerService";
import BannerForm from "./BannerForm";
import {
    buildBannerSubmitFormData,
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

    const selectedImagePreviewUrl = useMemo(() => {
        if (!form?.feature_img_file) {
            return "";
        }
        return URL.createObjectURL(form.feature_img_file);
    }, [form?.feature_img_file]);

    useEffect(() => {
        if (!form?.feature_img_file || !selectedImagePreviewUrl.startsWith("blob:")) {
            return undefined;
        }
        return () => URL.revokeObjectURL(selectedImagePreviewUrl);
    }, [form?.feature_img_file, selectedImagePreviewUrl]);

    useEffect(() => {
        Promise.all([getBannerMeta(), getAdminBannerDetail(id)])
            .then(([meta, detail]) => {
                setCities(meta.cities || []);
                setForm(hydrateBannerForm(detail.banner));
            })
            .catch((error) => {
                setMessage(error?.response?.data?.message || "Khong tai duoc du lieu chinh sua.");
            })
            .finally(() => setLoading(false));
    }, [id]);

    function handleChange(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    function handleFileChange(file) {
        setForm((prev) => ({ ...prev, feature_img_file: file }));
        setErrors((prev) => ({ ...prev, feature_img_file: "" }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const nextErrors = validateBannerForm(form);
        setErrors(nextErrors);

        if (hasBannerErrors(nextErrors)) {
            setMessage("Vui long kiem tra lai thong tin truoc khi luu.");
            return;
        }

        setSubmitting(true);
        setMessage("");

        try {
            const payload = buildBannerSubmitFormData(form);
            await updateAdminBanner(id, payload);
            navigate(buildRolePath(role, "banners"));
        } catch (error) {
            setMessage(error?.response?.data?.message || "Khong the cap nhat banner.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading || !form) {
        return <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600">Dang tai du lieu chinh sua...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-6 text-white">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Banners</p>
                <h1 className="mt-2 text-3xl font-bold">Chinh sua banner #{id}</h1>
            </div>

            {message ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

            <BannerForm
                form={form}
                errors={errors}
                cities={cities}
                submitting={submitting}
                submitLabel="Lưu cập nhật"
                currentImageUrl={form.feature_img || ""}
                selectedImagePreviewUrl={selectedImagePreviewUrl}
                onChange={handleChange}
                onFileChange={handleFileChange}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
