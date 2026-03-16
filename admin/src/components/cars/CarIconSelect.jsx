import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getCarIconUrl } from "../../services/carService";

const ICON_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function CarIconSelect({ value, onChange, error, label = "Loại icon" }) {
    const normalizedValue = String(Number(value) || 1);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleOutsideClick(event) {
            if (!wrapperRef.current?.contains(event.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    const selectedIconUrl = getCarIconUrl(normalizedValue);

    return (
        <div className="space-y-2" ref={wrapperRef}>
            <label className="block text-sm font-semibold text-slate-700">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    className={`flex w-full min-h-[72px] items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${error ? "border-red-300" : "border-slate-300"} bg-white`}
                >
                    <span className="flex items-center gap-3">
                        <img
                            src={selectedIconUrl}
                            alt={`Icon ${normalizedValue}`}
                            className="h-11 w-11 rounded-xl border border-slate-200 bg-slate-50 object-contain p-1.5"
                        />
                        <span>
                            <span className="block text-sm font-semibold text-slate-900">Icon {normalizedValue}</span>
                            <span className="block text-xs text-slate-500">driver-icon-{normalizedValue}.png</span>
                        </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
                </button>

                {open ? (
                    <div className="absolute z-20 mt-2 grid w-full gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                        {ICON_OPTIONS.map((iconNumber) => {
                            const optionValue = String(iconNumber);
                            const isSelected = optionValue === normalizedValue;

                            return (
                                <button
                                    key={optionValue}
                                    type="button"
                                    onClick={() => {
                                        onChange(optionValue);
                                        setOpen(false);
                                    }}
                                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${isSelected
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                >
                                    <img
                                        src={getCarIconUrl(optionValue)}
                                        alt={`Icon ${optionValue}`}
                                        className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-contain p-1.5"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Icon {optionValue}</p>
                                        <p className="text-xs text-slate-500">driver-icon-{optionValue}.png</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
    );
}
