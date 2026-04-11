async function sha256Hex(input) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(String(input || ""));
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hasPasswordKey(key) {
    return ["password", "admin_password", "new_password", "confirm_password"].includes(String(key || ""));
}

export async function hashPasswordFields(payload) {
    if (!payload) {
        return payload;
    }

    if (payload instanceof FormData) {
        const clone = new FormData();
        for (const [key, value] of payload.entries()) {
            if (hasPasswordKey(key) && typeof value === "string") {
                clone.append(key, await sha256Hex(value));
            } else {
                clone.append(key, value);
            }
        }
        return clone;
    }

    if (typeof payload === "object" && !Array.isArray(payload)) {
        const entries = await Promise.all(
            Object.entries(payload).map(async ([key, value]) => {
                if (hasPasswordKey(key) && typeof value === "string") {
                    return [key, await sha256Hex(value)];
                }
                return [key, value];
            })
        );

        return Object.fromEntries(entries);
    }

    return payload;
}
