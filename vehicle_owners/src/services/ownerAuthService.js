import apiClient from './apiClient';

const unwrap = (response) => response.data?.data ?? response.data;

export const ownerAuthService = {
  isAuthenticated() {
    return Boolean(localStorage.getItem('owner_access_token'));
  },

  async loginOwnerAccount(payload) {
    const response = await apiClient.post('/auth/login', payload);
    const data = unwrap(response);

    if (data?.accessToken) {
      localStorage.setItem('owner_access_token', data.accessToken);
    }
    if (data?.refreshToken) {
      localStorage.setItem('owner_refresh_token', data.refreshToken);
    }
    if (data?.owner) {
      localStorage.setItem('owner_profile', JSON.stringify(data.owner));
    }

    return data;
  },

  async registerOwnerAccount(payload) {
    const response = await apiClient.post('/auth/register', payload);
    return unwrap(response);
  },

  async refreshOwnerToken() {
    const refreshToken = localStorage.getItem('owner_refresh_token');
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    const data = unwrap(response);
    if (data?.accessToken) {
      localStorage.setItem('owner_access_token', data.accessToken);
    }
    if (data?.refreshToken) {
      localStorage.setItem('owner_refresh_token', data.refreshToken);
    }
    return data;
  },

  async logoutOwnerAccount() {
    const refreshToken = localStorage.getItem('owner_refresh_token');
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } finally {
      localStorage.removeItem('owner_access_token');
      localStorage.removeItem('owner_refresh_token');
      localStorage.removeItem('owner_profile');
    }
    return true;
  },
};
