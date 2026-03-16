import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import CarIconSelect from "../../components/cars/CarIconSelect";
import { createCar } from "../../services/carService";

const initialForm = {
    ride_type: "",
    ride_desc: "",
    num_seats: "",
    icon_type: "1",
    avail: true,
    ride_img: null,
};

function validateForm(form) {
    const nextErrors = {};

    if (!form.ride_type.trim()) {
        nextErrors.ride_type = "Tên xe là bắt buộc.";
    } else if (form.ride_type.trim().length > 20) {
        nextErrors.ride_type = "Tên xe không được vượt quá 20 ký tự.";
    }

    if (!form.ride_desc.trim()) {
        nextErrors.ride_desc = "Mô tả xe là bắt buộc.";
    } else if (form.ride_desc.trim().length > 250) {
        nextErrors.ride_desc = "Mô tả xe không được vượt quá 250 ký tự.";
    }

    const seats = Number(form.num_seats);
    if (!Number.isInteger(seats) || seats <= 0) {
        nextErrors.num_seats = "Số chỗ ngồi phải là số nguyên dương.";
    }

    if (form.icon_type !== "" && (!Number.isInteger(Number(form.icon_type)) || Number(form.icon_type) < 1 || Number(form.icon_type) > 6)) {
        nextErrors.icon_type = "Loại icon phải là số nguyên từ 1 đến 6.";
    }

    if (!form.ride_img) {
        nextErrors.ride_img = "Vui lòng chọn ảnh xe.";
    } else {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(form.ride_img.type)) {
            nextErrors.ride_img = "Ảnh phải là jpeg, png, webp hoặc gif.";
        } else if (form.ride_img.size > 2 * 1024 * 1024) {
            nextErrors.ride_img = "Dung lượng ảnh không được vượt quá 2MB.";
        }
    }

    return nextErrors;
}

function buildFormData(form) {
    const formData = new FormData();
    formData.append("ride_type", form.ride_type.trim());
    formData.append("ride_desc", form.ride_desc.trim());
    formData.append("num_seats", String(Number(form.num_seats)));
    formData.append("icon_type", String(form.icon_type === "" ? 1 : Number(form.icon_type)));
    formData.append("avail", form.avail ? "1" : "0");
    formData.append("ride_img", form.ride_img);
    return formData;
}

export default function NewCar() {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });

    const previewUrl = useMemo(
        () => (form.ride_img ? URL.createObjectURL(form.ride_img) : ""),
        [form.ride_img]
    );
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    function updateField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const nextErrors = validateForm(form);

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            setSubmitMessage({ type: "error", text: "Vui lòng kiểm tra lại dữ liệu trước khi lưu." });
            return;
        }

        setSubmitting(true);
        setSubmitMessage({ type: "", text: "" });

        try {
            await createCar(buildFormData(form));
            setForm(initialForm);
            setErrors({});
            setSubmitMessage({ type: "success", text: "Thêm xe thành công." });
        } catch (error) {
            const message =
                error?.response?.data?.message || "Không thể thêm xe. Vui lòng thử lại.";
            setSubmitMessage({ type: "error", text: message });
        } finally {
            setSubmitting(false);
        }
    }

    function handleReset() {
        setForm(initialForm);
        setErrors({});
        setSubmitMessage({ type: "", text: "" });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">
                        Vehicle create
                    </p>
                    <h1 className="mt-2 text-3xl font-bold">Thêm xe mới</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">
                        Tạo xe mới, upload ảnh và kiểm soát trạng thái sẵn sàng ngay từ admin.
                    </p>
                </div>
                <Link
                    to="/admin/vehicles"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                    Xem danh sách xe
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tên xe</label>
                        <input
                            type="text"
                            value={form.ride_type}
                            onChange={(event) => updateField("ride_type", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                            placeholder="Ví dụ: Sedan"
                            maxLength={20}
                        />
                        {errors.ride_type ? <p className="mt-2 text-sm text-red-600">{errors.ride_type}</p> : null}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Mô tả xe</label>
                        <textarea
                            value={form.ride_desc}
                            onChange={(event) => updateField("ride_desc", event.target.value)}
                            className="min-h-36 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                            placeholder="Mô tả ngắn về xe"
                            maxLength={250}
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                            {errors.ride_desc ? <p className="text-sm text-red-600">{errors.ride_desc}</p> : <span />}
                            <p className="text-xs text-slate-500">{form.ride_desc.length}/250</p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Số chỗ ngồi</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={form.num_seats}
                                onChange={(event) => updateField("num_seats", event.target.value)}
                                className="w-full min-h-[72px] rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500"
                                placeholder="4"
                            />
                            {errors.num_seats ? <p className="mt-2 text-sm text-red-600">{errors.num_seats}</p> : null}
                        </div>

                        <CarIconSelect
                            value={form.icon_type}
                            onChange={(value) => updateField("icon_type", value)}
                            error={errors.icon_type}
                        />
                    </div>

                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.avail}
                            onChange={(event) => updateField("avail", event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Xe đang sẵn sàng nhận chuyến
                    </label>
                </section>

                <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Ảnh xe</label>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={(event) => updateField("ride_img", event.target.files?.[0] || null)}
                            className="block w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600"
                        />
                        <p className="mt-2 text-xs text-slate-500">Hỗ trợ jpeg, png, webp, gif. Tối đa 2MB.</p>
                        {errors.ride_img ? <p className="mt-2 text-sm text-red-600">{errors.ride_img}</p> : null}
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Car preview" className="h-64 w-full object-cover" />
                        ) : (
                            <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-slate-500">
                                Chưa có ảnh xem trước. Chọn file để kiểm tra trước khi lưu.
                            </div>
                        )}
                    </div>

                    {submitMessage.text ? (
                        <div
                            className={`rounded-2xl px-4 py-3 text-sm ${submitMessage.type === "success"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                                }`}
                        >
                            {submitMessage.text}
                        </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Lưu xe
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                        >
                            Reset form
                        </button>
                    </div>
                </section>
            </form>
        </div>
    );
}
