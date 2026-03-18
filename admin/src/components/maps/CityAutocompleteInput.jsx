import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./googleMapsLoader";

export default function CityAutocompleteInput({ value, onChange, onCitySelect, className = "" }) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!apiKey || !inputRef.current || autocompleteRef.current || !window.document) {
            if (!apiKey) {
                setErrorMessage("Thiếu VITE_GOOGLE_MAPS_API_KEY, không thể gợi ý thành phố.");
            }
            return;
        }

        let mounted = true;

        loadGoogleMaps({ apiKey, libraries: ["places"] })
            .then(() => {
                if (!mounted || !window.google?.maps?.places || !inputRef.current) return;

                const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
                    types: ["(cities)"],
                    fields: ["name", "formatted_address", "geometry"],
                });

                autocompleteRef.current = autocomplete;

                autocomplete.addListener("place_changed", () => {
                    const place = autocomplete.getPlace();
                    const selectedName = place?.formatted_address || place?.name || "";

                    if (selectedName) {
                        onChange(selectedName);
                    }

                    const location = place?.geometry?.location;
                    if (location && typeof onCitySelect === "function") {
                        onCitySelect({
                            name: selectedName,
                            lat: location.lat(),
                            lng: location.lng(),
                        });
                    }
                });
            })
            .catch((error) => {
                if (!mounted) return;
                setErrorMessage(error?.message || "Không thể tải gợi ý thành phố.");
            });

        return () => {
            mounted = false;
        };
    }, [apiKey, onChange, onCitySelect]);

    return (
        <>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={className}
                placeholder="Ví dụ: Ho Chi Minh City, Vietnam"
            />
            {errorMessage ? <p className="mt-1 text-xs text-amber-700">{errorMessage}</p> : null}
        </>
    );
}
