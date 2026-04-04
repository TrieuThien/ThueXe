import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_OWNER_API_URL || '/api/owner',
  timeout: 12000,
});

function clearOwnerSession() {
  localStorage.removeItem('owner_access_token');
  localStorage.removeItem('owner_refresh_token');
  localStorage.removeItem('owner_profile');
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('owner_access_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error.response?.status || 0);
    const payload = error.response?.data || {};

    if (status === 401) {
      clearOwnerSession();

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (window.location.pathname.startsWith('/owner') && window.location.pathname !== '/owner/login') {
        window.location.assign(`/owner/login?from=${encodeURIComponent(currentPath)}`);
      }
    }

    const normalizedError = new Error(
      payload.error?.message || payload.message || 'Co loi khi ket noi den may chu. Vui long thu lai.',
    );
    normalizedError.code = payload.error?.code || payload.code || 'UNKNOWN_ERROR';
    normalizedError.fields = payload.error?.fields || payload.details || [];
    normalizedError.status = status;
    return Promise.reject(normalizedError);
  },
);

export default apiClient;

