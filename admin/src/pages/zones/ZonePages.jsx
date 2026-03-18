import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { buildRolePath } from "../../config/roleRoutes";
import {
    createZone,
    getZoneDetail,
    getZoneMeta,
    updateZone,
} from "../../services/tariffZoneService";
import ZoneForm from "./ZoneForm";

const DEFAULT_FORM = {
    title: "",
    city_id: "",
    zone_fare_type: "1",
    zone_fare_value: "0",
    zone_bound_coords: "",
};

function validateZoneForm(form) {
    const errors = {};

    if (!form.title.trim()) {
        errors.title = "Tên vùng là bắt buộc.";
    }

    if (!form.city_id) {
        errors.city_id = "Vui lòng chọn thành phố.";
    }

    if (!["1", "2", 1, 2].includes(form.zone_fare_type)) {
        errors.zone_fare_type = "Kiểu tăng giá không hợp lệ.";
    }

    const fareValue = Number(form.zone_fare_value);
    if (!Number.isFinite(fareValue) || fareValue < 0) {
        errors.zone_fare_value = "Giá trị tăng phải >= 0.";
    }

    if (!form.zone_bound_coords) {
        errors.zone_bound_coords = "Bạn cần vẽ polygon vùng.";
    }

    return errors;
}

function buildPayload(form) {
    return {
        title: form.title.trim(),
        city_id: Number(form.city_id),
        zone_fare_type: Number(form.zone_fare_type),
        zone_fare_value: Number(form.zone_fare_value || 0),
        zone_bound_coords: form.zone_bound_coords,
    };
}

function ZoneBasePage({ mode }) {
    const isEdit = mode === "edit";
    const { id } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const navigate = useNavigate();

    const [form, setForm] = useState(DEFAULT_FORM);
    const [cityRoutes, setCityRoutes] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const requests = [getZoneMeta()];
        if (isEdit) {
            requests.push(getZoneDetail(id));
        }

        Promise.all(requests)
            .then(([meta, detail]) => {
                setCityRoutes(meta.cityRoutes || []);

                if (isEdit && detail?.zone) {
                    setForm({
                        title: detail.zone.title || "",
                        city_id: detail.zone.city_id ? String(detail.zone.city_id) : "",
                        zone_fare_type: detail.zone.zone_fare_type ? String(detail.zone.zone_fare_type) : "1",
                        zone_fare_value: detail.zone.zone_fare_value === undefined ? "0" : String(detail.zone.zone_fare_value),
                        zone_bound_coords: detail.zone.zone_bound_coords || "",
                    });
                }
            })
            .catch((error) => {
                setMessage(error?.response?.data?.message || "Không tải được dữ liệu vùng.");
            })
            .finally(() => setLoading(false));
    }, [id, isEdit]);

    function handleChange(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const nextErrors = validateZoneForm(form);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            setMessage("Vui lòng kiểm tra lại thông tin vùng.");
            return;
        }

        setSubmitting(true);
        setMessage("");

        try {
            const payload = buildPayload(form);

            if (isEdit) {
                await updateZone(id, payload);
            } else {
                await createZone(payload);
            }

            navigate(buildRolePath(role, "areas"));
        } catch (error) {
            setMessage(error?.response?.data?.message || "Không thể lưu vùng.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600">Đang tải dữ liệu vùng...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-6 py-6 text-white">
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Zones</p>
                <h1 className="mt-2 text-3xl font-bold">
                    {isEdit ? `Chỉnh sửa vùng #${id}` : "Tạo mới vùng"}
                </h1>
            </div>

            {message ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

            <ZoneForm
                form={form}
                errors={errors}
                cityRoutes={cityRoutes}
                onChange={handleChange}
                onSubmit={handleSubmit}
                submitLabel={isEdit ? "Lưu cập nhật" : "Tạo vùng"}
                submitting={submitting}
            />
        </div>
    );
}

export function ZoneCreatePage() {
    return <ZoneBasePage mode="create" />;
}

export function ZoneEditPage() {
    return <ZoneBasePage mode="edit" />;
}
