import { useEffect, useMemo, useState } from "react";
import { Loader2, PencilLine, RefreshCcw, X } from "lucide-react";
import CarIconSelect from "../../components/cars/CarIconSelect";
import { fetchCars, getCarIconUrl, getCarImageUrl, updateCar } from "../../services/carService";

const emptyEditState = {
    id: null,
    ride_type: "",
    ride_desc: "",
    num_seats: "",
    icon_type: "1",
    avail: true,
    ride_img: null,
    currentImage: "",
};

function validateCarForm(form, requireImage = false) {
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

    if (form.ride_img) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(form.ride_img.type)) {
            nextErrors.ride_img = "Ảnh phải là jpeg, png, webp hoặc gif.";
        } else if (form.ride_img.size > 2 * 1024 * 1024) {
            nextErrors.ride_img = "Dung lượng ảnh không được vượt quá 2MB.";
        }
    }

    if (requireImage && !form.ride_img && !form.currentImage) {
        nextErrors.ride_img = "Vui lòng chọn ảnh xe.";
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

    if (form.ride_img) {
        formData.append("ride_img", form.ride_img);
    }

    return formData;
}

function EditCarModal({ car, saving, errors, submitMessage, onChange, onClose, onSubmit }) {
    const previewUrl = useMemo(() => {
        if (car.ride_img) {
            return URL.createObjectURL(car.ride_img);
        }

        return getCarImageUrl(car.currentImage);
    }, [car.currentImage, car.ride_img]);
    useEffect(() => {
        return () => {
            if (car.ride_img && previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [car.ride_img, previewUrl]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[28px] bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Edit car</p>
                        <h2 className="mt-1 text-2xl font-bold text-slate-900">Cập nhật xe #{car.id}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="grid gap-6 px-6 py-6 lg:grid-cols-[1.3fr_0.9fr]">
                    <section className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Tên xe</label>
                            <input
                                type="text"
                                value={car.ride_type}
                                onChange={(event) => onChange("ride_type", event.target.value)}
                                className="w-full  rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                                maxLength={20}
                            />
                            {errors.ride_type ? <p className="mt-2 text-sm text-red-600">{errors.ride_type}</p> : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Mô tả xe</label>
                            <textarea
                                value={car.ride_desc}
                                onChange={(event) => onChange("ride_desc", event.target.value)}
                                className="min-h-36 min-h-[72px] w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                                maxLength={250}
                            />
                            <div className="mt-2 flex items-center justify-between gap-3">
                                {errors.ride_desc ? <p className="text-sm text-red-600">{errors.ride_desc}</p> : <span />}
                                <p className="text-xs text-slate-500">{car.ride_desc.length}/250</p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Số chỗ ngồi</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={car.num_seats}
                                    onChange={(event) => onChange("num_seats", event.target.value)}
                                    className="w-full min-h-[72px] rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                                />
                                {errors.num_seats ? <p className="mt-2 text-sm text-red-600">{errors.num_seats}</p> : null}
                            </div>

                            <CarIconSelect
                                value={car.icon_type}
                                onChange={(value) => onChange("icon_type", value)}
                                error={errors.icon_type}
                            />
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                            <input
                                type="checkbox"
                                checked={car.avail}
                                onChange={(event) => onChange("avail", event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300"
                            />
                            Xe đang sẵn sàng
                        </label>
                    </section>

                    <section className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Ảnh mới</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                onChange={(event) => onChange("ride_img", event.target.files?.[0] || null)}
                                className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                            />
                            <p className="mt-2 text-xs text-slate-500">Bỏ trống nếu muốn giữ ảnh hiện tại.</p>
                            {errors.ride_img ? <p className="mt-2 text-sm text-red-600">{errors.ride_img}</p> : null}
                        </div>

                        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                            {previewUrl ? (
                                <img src={previewUrl} alt={car.ride_type} className="h-64 w-full object-cover" />
                            ) : (
                                <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-slate-500">
                                    Xe này hiện chưa có ảnh hiển thị.
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
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Lưu thay đổi
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                        </div>
                    </section>
                </form>
            </div>
        </div>
    );
}

export default function CarList() {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageMessage, setPageMessage] = useState({ type: "", text: "" });
    const [selectedCar, setSelectedCar] = useState(emptyEditState);
    const [editErrors, setEditErrors] = useState({});
    const [saving, setSaving] = useState(false);

    async function loadCars(showRefreshMessage = false) {
        setLoading(true);

        try {
            const data = await fetchCars();
            setCars(data);
            if (showRefreshMessage) {
                setPageMessage({ type: "success", text: "Đã tải lại danh sách xe." });
            }
        } catch (error) {
            const message =
                error?.response?.data?.message || "Không thể tải danh sách xe.";
            setPageMessage({ type: "error", text: message });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCars(false);
    }, []);

    function openEditModal(car) {
        setSelectedCar({
            id: car.id,
            ride_type: car.ride_type || "",
            ride_desc: car.ride_desc || "",
            num_seats: String(car.num_seats ?? ""),
            icon_type: String(car.icon_type ?? 1),
            avail: Number(car.avail) === 1,
            ride_img: null,
            currentImage: car.ride_img || "",
        });
        setEditErrors({});
        setPageMessage({ type: "", text: "" });
    }

    function closeEditModal() {
        setSelectedCar(emptyEditState);
        setEditErrors({});
    }

    function updateSelectedCar(field, value) {
        setSelectedCar((prev) => ({ ...prev, [field]: value }));
        setEditErrors((prev) => ({ ...prev, [field]: "" }));
    }

    async function handleUpdateCar(event) {
        event.preventDefault();
        const nextErrors = validateCarForm(selectedCar, false);

        if (Object.keys(nextErrors).length > 0) {
            setEditErrors(nextErrors);
            return;
        }

        setSaving(true);
        setPageMessage({ type: "", text: "" });

        try {
            const updatedCar = await updateCar(selectedCar.id, buildFormData(selectedCar));
            setCars((prev) => prev.map((item) => (item.id === updatedCar.id ? updatedCar : item)));
            setPageMessage({ type: "success", text: `Cập nhật xe #${updatedCar.id} thành công.` });
            closeEditModal();
        } catch (error) {
            const message =
                error?.response?.data?.message || "Không thể cập nhật xe.";
            setPageMessage({ type: "error", text: message });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Vehicle list</p>
                    <h1 className="mt-2 text-3xl font-bold">Danh sách xe</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">
                        Theo dõi toàn bộ xe trong bảng rides, kiểm tra trạng thái hoạt động và cập nhật nhanh qua modal chỉnh sửa.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => loadCars(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Tải lại
                </button>
            </div>

            {pageMessage.text ? (
                <div
                    className={`rounded-2xl px-4 py-3 text-sm ${pageMessage.type === "success"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                        }`}
                >
                    {pageMessage.text}
                </div>
            ) : null}

            {loading ? (
                <div className="flex min-h-64 items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3 text-slate-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Đang tải danh sách xe...</span>
                    </div>
                </div>
            ) : cars.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
                    Chưa có xe nào trong hệ thống.
                </div>
            ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                    {cars.map((car) => (
                        <article
                            key={car.id}
                            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="grid gap-0 md:grid-cols-[440px_1fr]">
                                <div className="bg-slate-100">
                                    {car.ride_img ? (
                                        <img
                                            src={getCarImageUrl(car.ride_img)}
                                            alt={car.ride_type}
                                            className="h-full min-h-64 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full min-h-64 items-center justify-center px-6 text-center text-sm text-slate-500">
                                            Chưa có ảnh xe
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                                Car #{car.id}
                                            </p>
                                            <h2 className="mt-2 text-2xl font-bold text-slate-900">{car.ride_type}</h2>
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${Number(car.avail) === 1
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700"
                                                }`}
                                        >
                                            {Number(car.avail) === 1 ? "Đang rảnh" : "Tạm bận"}
                                        </span>
                                    </div>

                                    <p className="text-sm leading-6 text-slate-600">{car.ride_desc}</p>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Số chỗ</p>
                                            <p className="mt-2 text-lg font-semibold text-slate-900">{car.num_seats}</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Icon type</p>
                                            <div className="mt-2 flex items-center gap-3">
                                                <img
                                                    src={getCarIconUrl(car.icon_type)}
                                                    alt={`Icon ${car.icon_type}`}
                                                    className="h-10 w-10 rounded-xl border border-slate-200 bg-white object-contain p-1.5"
                                                />
                                                <p className="text-lg font-semibold text-slate-900">{car.icon_type}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => openEditModal(car)}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                    >
                                        <PencilLine className="h-4 w-4" />
                                        Chỉnh sửa
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {selectedCar.id ? (
                <EditCarModal
                    car={selectedCar}
                    saving={saving}
                    errors={editErrors}
                    submitMessage={pageMessage}
                    onChange={updateSelectedCar}
                    onClose={closeEditModal}
                    onSubmit={handleUpdateCar}
                />
            ) : null}
        </div>
    );
}
