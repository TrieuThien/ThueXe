let accessToken = "";

export function getAccessToken() {
    return accessToken;
}

export function setAccessToken(token) {
    accessToken = token ? String(token) : "";
}

export function clearAccessToken() {
    accessToken = "";
}
