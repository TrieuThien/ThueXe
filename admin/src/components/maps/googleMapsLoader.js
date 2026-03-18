const GOOGLE_MAPS_SCRIPT_ID = "google-maps-admin-sdk";

function normalizeLibraries(libraries = []) {
    const baseLibraries = ["places"];
    return [...new Set([...(libraries || []), ...baseLibraries].filter(Boolean))].sort();
}

export function loadGoogleMaps({ apiKey, libraries = [] }) {
    if (!apiKey) {
        return Promise.reject(new Error("Thiếu Google Maps API key."));
    }

    const normalizedLibraries = normalizeLibraries(libraries);

    if (window.google?.maps) {
        return Promise.resolve(window.google);
    }

    if (window.__googleMapsScriptPromise) {
        return window.__googleMapsScriptPromise;
    }

    window.__googleMapsScriptPromise = new Promise((resolve, reject) => {
        const callbackName = `__googleMapsAdminInit_${Date.now()}`;
        let script = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

        const cleanupCallback = () => {
            delete window[callbackName];
        };

        window[callbackName] = () => {
            cleanupCallback();
            resolve(window.google);
        };

        if (!script) {
            script = document.createElement("script");
            script.id = GOOGLE_MAPS_SCRIPT_ID;
            script.async = true;
            script.defer = true;

            const params = new URLSearchParams({
                key: apiKey,
                v: "weekly",
                callback: callbackName,
            });

            if (normalizedLibraries.length) {
                params.set("libraries", normalizedLibraries.join(","));
            }

            script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
            document.head.appendChild(script);
        }

        script.onerror = () => {
            cleanupCallback();
            window.__googleMapsScriptPromise = null;
            reject(new Error("Không tải được Google Maps script."));
        };
    });

    return window.__googleMapsScriptPromise;
}
