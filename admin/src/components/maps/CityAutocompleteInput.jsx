import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./googleMapsLoader";

export default function CityAutocompleteInput({ value, onChange, onCitySelect, className = "" }) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
    const hostRef = useRef(null);
    const autocompleteRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const onCitySelectRef = useRef(onCitySelect);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        onChangeRef.current = onChange;
        onCitySelectRef.current = onCitySelect;
    }, [onChange, onCitySelect]);

    useEffect(() => {
        if (!apiKey || !window.document) {
            if (!apiKey) setErrorMessage("Missing VITE_GOOGLE_MAPS_API_KEY.");
            return undefined;
        }

        let cancelled = false;
        let cleanup = () => {};

        loadGoogleMaps({ apiKey, libraries: ["places"] })
            .then(() => {
                if (cancelled || !hostRef.current || !window.google?.maps?.places?.PlaceAutocompleteElement) return;

                const element = new window.google.maps.places.PlaceAutocompleteElement({
                    placeholder: "Vi du: Ho Chi Minh City, Vietnam",
                    includedPrimaryTypes: ["locality", "administrative_area_level_1"],
                });

                element.className = className || "w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none";
                element.style.display = "block";
                element.style.width = "100%";
                if (typeof value === "string" && value.trim()) {
                    element.value = value;
                }

                const handleInput = (event) => {
                    const nextValue = event?.target?.value ?? element.value ?? "";
                    if (typeof onChangeRef.current === "function") {
                        onChangeRef.current(nextValue);
                    }
                };

                const handleSelect = async (event) => {
                    const placePrediction = event?.placePrediction;
                    const place = placePrediction?.toPlace?.() || event?.place;
                    if (!place) return;

                    await place.fetchFields({
                        fields: ["formattedAddress", "displayName", "location"],
                    });

                    const selectedName = place.formattedAddress || place.displayName || "";
                    const lat = place?.location?.lat?.();
                    const lng = place?.location?.lng?.();

                    if (selectedName && typeof onChangeRef.current === "function") {
                        onChangeRef.current(selectedName);
                    }

                    if (
                        selectedName &&
                        Number.isFinite(lat) &&
                        Number.isFinite(lng) &&
                        typeof onCitySelectRef.current === "function"
                    ) {
                        onCitySelectRef.current({
                            name: selectedName,
                            lat,
                            lng,
                        });
                    }
                };

                hostRef.current.innerHTML = "";
                hostRef.current.appendChild(element);
                autocompleteRef.current = element;

                element.addEventListener("input", handleInput);
                element.addEventListener("change", handleInput);
                element.addEventListener("gmp-select", handleSelect);
                element.addEventListener("gmp-placeselect", handleSelect);

                cleanup = () => {
                    element.removeEventListener("input", handleInput);
                    element.removeEventListener("change", handleInput);
                    element.removeEventListener("gmp-select", handleSelect);
                    element.removeEventListener("gmp-placeselect", handleSelect);
                    if (hostRef.current?.contains(element)) {
                        hostRef.current.removeChild(element);
                    }
                    if (hostRef.current) {
                        hostRef.current.innerHTML = "";
                    }
                    autocompleteRef.current = null;
                };
            })
            .catch((error) => {
                if (cancelled) return;
                setErrorMessage(error?.message || "Cannot load city suggestions.");
            });

        return () => {
            cancelled = true;
            cleanup();
        };
    }, [apiKey, className]);

    useEffect(() => {
        const element = autocompleteRef.current;
        if (!element || typeof value !== "string") return;
        if (element.value !== value) {
            element.value = value;
        }
    }, [value]);

    return (
        <div className="relative">
            <div ref={hostRef} className="w-full" />
            {errorMessage ? <p className="mt-1 text-xs text-amber-700">{errorMessage}</p> : null}
        </div>
    );
}
