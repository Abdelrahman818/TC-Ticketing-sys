const DEFAULT_API_BASE_URL = 'http://localhost:5000';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  }

  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
};

export const BASE_API_URL = getApiBaseUrl().replace(/\/$/, '');
export const API_BASE_URL = `${BASE_API_URL}/api`;
export const AUTH_STORAGE_KEY = 'ticketApiToken';
export const USER_STORAGE_KEY = 'ticketUser';

export const API_ROUTES = {
  health: `${API_BASE_URL}/health`,
  auth: {
    sync: `${API_BASE_URL}/auth/sync`,
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    devLogin: `${API_BASE_URL}/auth/dev-login`,
    devRegister: `${API_BASE_URL}/auth/dev-register`,
    me: `${API_BASE_URL}/auth/me`,
    logout: `${API_BASE_URL}/auth/logout`,
  },
  tickets: {
    list: `${API_BASE_URL}/tickets`,
    byId: (id) => `${API_BASE_URL}/tickets/${id}`,
    status: (id) => `${API_BASE_URL}/tickets/${id}/status`,
    assign: (id) => `${API_BASE_URL}/tickets/${id}/assign`,
    archive: (id) => `${API_BASE_URL}/tickets/${id}/archive`,
    comments: (id) => `${API_BASE_URL}/tickets/${id}/comments`,
  },
  users: {
    list: `${API_BASE_URL}/users`,
    assignable: `${API_BASE_URL}/users/assignable`,
    byId: (id) => `${API_BASE_URL}/users/${id}`,
    role: (id) => `${API_BASE_URL}/users/${id}/role`,
    deactivate: (id) => `${API_BASE_URL}/users/${id}/deactivate`,
  },
  departments: {
    list: `${API_BASE_URL}/departments`,
    byId: (id) => `${API_BASE_URL}/departments/${id}`,
  },
  stages: {
    list: `${API_BASE_URL}/stages`,
    byId: (id) => `${API_BASE_URL}/stages/${id}`,
    reorder: `${API_BASE_URL}/stages/reorder`,
  },
  dashboard: {
    me: `${API_BASE_URL}/dashboard/me`,
    team: `${API_BASE_URL}/dashboard/team`,
    departments: `${API_BASE_URL}/dashboard/departments`,
    supervisors: `${API_BASE_URL}/dashboard/supervisors`,
    system: `${API_BASE_URL}/dashboard/system`,
  },
  reports: {
    tickets: `${API_BASE_URL}/reports/tickets`,
    performance: `${API_BASE_URL}/reports/performance`,
  },
  auditLogs: {
    list: `${API_BASE_URL}/audit-logs`,
  },
};

export const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(AUTH_STORAGE_KEY);
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const setStoredToken = (token) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (token) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

export const setStoredUser = (user) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const clearStoredAuth = () => {
  setStoredToken(null);
  setStoredUser(null);
};

export const logoutUser = async () => {
  try {
    await apiRequest(API_ROUTES.auth.logout, { method: 'POST' });
  } catch (error) {
    console.warn('Logout request failed', error);
  } finally {
    clearStoredAuth();
  }
};

async function resolveAuthToken() {
  return getStoredToken();
}

export async function apiRequest(endpoint, options = {}) {
  const { body, headers, _retry, ...requestOptions } = options;
  const url = endpoint;
  let authToken = getStoredToken();

  if (!authToken) {
    authToken = await resolveAuthToken();
  }

  const requestHeaders = {
    Accept: 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(headers || {}),
  };

  if (body && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...requestOptions,
    headers: requestHeaders,
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 401 && !options._retry) {
    clearStoredAuth();
    throw new Error(payload?.message || 'Unauthorized');
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Request failed');
  }

  return payload;
}
