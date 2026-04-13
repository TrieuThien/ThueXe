import { apiClient } from "./authService";

function payload(response) {
    return response?.data?.data || response?.data || {};
}

export async function getDashboardSummary(params = {}) {
    const response = await apiClient.get("/api/dashboard/admin", { params });
    return payload(response);
}

export async function getTransactions(params = {}) {
    const response = await apiClient.get("/api/wallets/admin/transactions", { params });
    return payload(response);
}

export async function getWallets(params = {}) {
    const response = await apiClient.get("/api/wallets/admin/accounts", { params });
    return payload(response);
}

export async function adjustWallet(payloadData) {
    const response = await apiClient.post("/api/wallets/admin/adjustments", payloadData);
    return payload(response);
}

export async function updateWalletStatus(walletId, status) {
    const response = await apiClient.patch(`/api/wallets/admin/accounts/${walletId}/status`, { status });
    return payload(response);
}

export async function getPayouts(params = {}) {
    const response = await apiClient.get("/api/wallets/admin/overview", { params });
    const data = payload(response);
    return {
        items: data.pending_withdrawals || [],
        overview: data.overview || {},
    };
}

export async function reviewPayout(payoutId, payloadData) {
    const response = await apiClient.patch(`/api/wallets/admin/withdrawals/${payoutId}`, payloadData);
    return payload(response);
}

export async function getDocuments(params = {}) {
    const response = await apiClient.get("/api/documents/submissions", { params });
    return payload(response);
}

export async function reviewDocument(actorType, submissionId, payloadData) {
    const response = await apiClient.patch(
        `/api/documents/submissions/${actorType}/${submissionId}/review`,
        payloadData
    );
    return payload(response);
}

export async function getSupportMessages(params = {}) {
    const response = await apiClient.get("/api/chats/support", { params });
    return payload(response);
}

export async function sendSupportReply(payloadData) {
    const response = await apiClient.post("/api/chats/support", payloadData);
    return payload(response);
}

export async function getOperationsReport(params = {}) {
    const response = await apiClient.get("/api/reports/operations", { params });
    return payload(response);
}

export async function getSystemSettings() {
    const response = await apiClient.get("/api/admin/settings/system");
    return payload(response);
}

export async function updateSystemSettings(payloadData) {
    const response = await apiClient.patch("/api/admin/settings/system", payloadData);
    return payload(response);
}

export async function getCurrencies() {
    const response = await apiClient.get("/api/admin/settings/currencies");
    return payload(response);
}

export async function createCurrency(payloadData) {
    const response = await apiClient.post("/api/admin/settings/currencies", payloadData);
    return payload(response);
}

export async function updateCurrency(id, payloadData) {
    const response = await apiClient.put(`/api/admin/settings/currencies/${id}`, payloadData);
    return payload(response);
}

export async function setDefaultCurrency(id) {
    const response = await apiClient.patch(`/api/admin/settings/currencies/${id}/default`);
    return payload(response);
}
