const responseCache = new Map();
const inflightRequests = new Map();

const TTL_MS = 60 * 1000;

function buildKey(userId, idempotencyKey) {
    return `${userId}:${idempotencyKey}`;
}

function isExpired(entry) {
    return !entry || entry.expiresAt < Date.now();
}

export function rememberIdempotentResponse(userId, idempotencyKey, response) {
    const key = buildKey(userId, idempotencyKey);
    responseCache.set(key, {
        response,
        expiresAt: Date.now() + TTL_MS,
    });
}

export function consumeCachedResponse(userId, idempotencyKey) {
    const key = buildKey(userId, idempotencyKey);
    const entry = responseCache.get(key);

    if (isExpired(entry)) {
        responseCache.delete(key);
        return null;
    }

    return entry.response;
}

export function rememberInflightPromise(userId, idempotencyKey, promise) {
    const key = buildKey(userId, idempotencyKey);
    inflightRequests.set(key, promise);
}

export function getInflightPromise(userId, idempotencyKey) {
    const key = buildKey(userId, idempotencyKey);
    return inflightRequests.get(key) || null;
}

export function clearInflightPromise(userId, idempotencyKey) {
    const key = buildKey(userId, idempotencyKey);
    inflightRequests.delete(key);
}
