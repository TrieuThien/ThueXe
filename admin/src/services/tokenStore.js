const STORAGE_KEY = "admin_access_token";

function getFromStorage() {
    try {
        return typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "" : "";
    } catch {
        return "";
    }
}

let accessToken = getFromStorage();

export function getAccessToken() {
    return accessToken || getFromStorage();
}

export function setAccessToken(token) {
    accessToken = token ? String(token) : "";
    try {
        if (typeof window !== "undefined") {
            if (accessToken) {
                localStorage.setItem(STORAGE_KEY, accessToken);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    } catch {
        // Ignore storage errors (private browsing mode, etc.)
    }
}

export function clearAccessToken() {
    accessToken = "";
    try {
        if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Ignore storage errors
    }
}
