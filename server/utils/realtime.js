import { EventEmitter } from "events";

const realtimeBus = new EventEmitter();
realtimeBus.setMaxListeners(1000);

const sseClients = new Map();
let nextClientId = 1;

function safeJson(data) {
    try {
        return JSON.stringify(data);
    } catch {
        return JSON.stringify({});
    }
}

function shouldDeliver(client, eventName, targetUserIds = []) {
    if (targetUserIds.length > 0 && !targetUserIds.includes(Number(client.userId))) {
        return false;
    }

    if (!client.events || client.events.size === 0) {
        return true;
    }

    return client.events.has(eventName);
}

function writeEvent(res, eventName, payload) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${safeJson(payload)}\n\n`);
}

export function publishRealtimeEvent(eventName, payload = {}, { targetUserIds = [] } = {}) {
    const normalizedTargets = Array.isArray(targetUserIds)
        ? targetUserIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
        : [];

    realtimeBus.emit(eventName, payload);

    for (const client of sseClients.values()) {
        if (!shouldDeliver(client, eventName, normalizedTargets)) continue;
        writeEvent(client.res, eventName, payload);
    }
}

export function registerRealtimeSse({ userId, events = null, req, res }) {
    const clientId = nextClientId++;

    const eventSet = Array.isArray(events) && events.length > 0
        ? new Set(events.map((item) => String(item).trim()).filter(Boolean))
        : null;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const heartbeat = setInterval(() => {
        res.write(`event: ping\n`);
        res.write(`data: {"ts":"${new Date().toISOString()}"}\n\n`);
    }, 25000);

    sseClients.set(clientId, {
        id: clientId,
        userId: Number(userId),
        events: eventSet,
        res,
        heartbeat,
    });

    writeEvent(res, "realtime.connected", {
        client_id: clientId,
        user_id: Number(userId),
        subscribed_events: eventSet ? Array.from(eventSet.values()) : ["*"],
        connected_at: new Date().toISOString(),
    });

    req.on("close", () => {
        const client = sseClients.get(clientId);
        if (client?.heartbeat) clearInterval(client.heartbeat);
        sseClients.delete(clientId);
    });

    return clientId;
}

export function getRealtimeStats() {
    return {
        total_clients: sseClients.size,
    };
}
