import { getToken, clearSession } from './auth';

// ChitPro API Client Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const token = getToken();
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      // Expired/invalid token on a protected call: drop session and go to login
      if (res.status === 401 && token && typeof window !== 'undefined' && !endpoint.includes('/auth/login')) {
        clearSession();
        window.location.href = '/login';
      }
      let errorMsg = `HTTP Error ${res.status}`;
      const text = await res.text();
      try {
        const errJson = JSON.parse(text);
        errorMsg = errJson.message || (errJson.errors && errJson.errors.join(', ')) || JSON.stringify(errJson);
      } catch {
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }
    const json = await res.json();
    // Handle standard ApiResponse wrapper { success, data, message } or direct array/object
    if (json && typeof json === 'object' && 'data' in json && 'success' in json) {
      return json.data;
    }
    return json;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

// FR-01: Authentication
export const login = (credentials) => fetchApi('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const forgotPassword = (data) => fetchApi('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) });
export const resetPassword = (data) => fetchApi('/api/v1/auth/reset-password', { method: 'POST', body: JSON.stringify(data) });
export const getCurrentUser =() => fetchApi('/api/v1/auth/me');
export const logout = () => fetchApi('/api/v1/auth/logout', { method: 'POST' });
export const changePassword = (data) => fetchApi('/api/v1/auth/change-password', { method: 'POST', body: JSON.stringify(data) });

// FR-02: Dashboard
export const getDashboardSummary = () => fetchApi('/api/v1/dashboard/summary');
export const getDashboardStats = () => fetchApi('/api/v1/dashboard/summary'); // compatibility
export const getUpcomingAuctions = () => fetchApi('/api/v1/dashboard/upcoming-auctions');
export const getRecentPayments = () => fetchApi('/api/v1/dashboard/recent-payments');

// FR-03: Customers
export const getCustomers = (search = '') => fetchApi(`/api/v1/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const getCustomerById = (id) => fetchApi(`/api/v1/customers/${id}`);
export const createCustomer = (data) => fetchApi('/api/v1/customers', { method: 'POST', body: JSON.stringify(data) });
export const updateCustomer = (id, data) => fetchApi(`/api/v1/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const setCustomerStatus = (id, isActive) => fetchApi(`/api/v1/customers/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) });
export const deleteCustomer =(id) => fetchApi(`/api/v1/customers/${id}`, { method: 'DELETE' });

// Compatibility aliases for existing components:
export const getMembers = (search = '') => getCustomers(search);
export const getMemberById = (id) => getCustomerById(id);
export const createMember = (data) => createCustomer(data);
export const deleteMember = (id) => deleteCustomer(id);

// FR-04: Chit Groups
export const getChitGroups = () => fetchApi('/api/v1/chit-groups');
export const getChitGroupById = (id) => fetchApi(`/api/v1/chit-groups/${id}`);
export const createChitGroup = (data) => fetchApi('/api/v1/chit-groups', { method: 'POST', body: JSON.stringify(data) });
export const deleteChitGroup = (id) => fetchApi(`/api/v1/chit-groups/${id}`, { method: 'DELETE' });
export const enrollMemberInGroup = (groupId, data) => fetchApi(`/api/v1/chit-groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(data) });

// FR-06 & Schedule Table: "how much amount will pay remaining amount to company"
export const getChitSchedules = (groupId) => fetchApi(`/api/v1/chit-groups/${groupId}/schedules`);

// FR-07: Payments & Collections (collection date, chit date, chit person, amount)
export const getPayments = (params = {}) => {
  const query = new URLSearchParams();
  if (params.chitGroupId) query.append('chitGroupId', params.chitGroupId);
  if (params.customerId) query.append('customerId', params.customerId);
  if (params.search) query.append('search', params.search);
  const qStr = query.toString();
  return fetchApi(`/api/v1/payments${qStr ? `?${qStr}` : ''}`);
};
export const getCollections = (params) => getPayments(params); // compatibility
export const createPayment = (data) => fetchApi('/api/v1/payments', { method: 'POST', body: JSON.stringify(data) });
export const createCollection = (data) => createPayment(data); // compatibility
export const reversePayment = (id, reason) => fetchApi(`/api/v1/payments/${id}/reverse`, { method: 'POST', body: JSON.stringify(reason) });
export const deletePayment = (id) => fetchApi(`/api/v1/payments/${id}`, { method: 'DELETE' });
export const deleteCollection = (id) => deletePayment(id); // compatibility

// FR-08: Auctions
export const getAuctions = (chitGroupId) => fetchApi(`/api/v1/auctions${chitGroupId ? `?chitGroupId=${chitGroupId}` : ''}`);
export const recordAuction = (id, data) => fetchApi(`/api/v1/auctions/${id}/submit-result`, { method: 'POST', body: JSON.stringify(data) });

// FR-10: Prize Payouts
export const getPayouts = () => fetchApi('/api/v1/payouts');
export const markPayoutPaid = (id, txnRef) => fetchApi(`/api/v1/payouts/${id}/mark-paid`, { method: 'POST', body: JSON.stringify(txnRef) });

// FR-12: Expenses
export const getExpenses = (category = '') => fetchApi(`/api/v1/expenses${category ? `?category=${encodeURIComponent(category)}` : ''}`);
export const createExpense = (data) => fetchApi('/api/v1/expenses', { method: 'POST', body: JSON.stringify(data) });
export const deleteExpense = (id) => fetchApi(`/api/v1/expenses/${id}`, { method: 'DELETE' });

// FR-13: Reports
export const getCollectionsReport = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetchApi(`/api/v1/reports/collections${q ? `?${q}` : ''}`);
};
export const getOutstandingReport = () => fetchApi('/api/v1/reports/outstanding');
export const getReconciliationReport = () => fetchApi('/api/v1/reports/reconciliation');

// FR-15: Audit Logs
export const getAuditLogs = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetchApi(`/api/v1/audit-logs${q ? `?${q}` : ''}`);
};

// FR-16: Company Settings
export const getCompanySettings = () => fetchApi('/api/v1/settings/company');
export const updateCompanySettings = (data) => fetchApi('/api/v1/settings/company', { method: 'PUT', body: JSON.stringify(data) });
