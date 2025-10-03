import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error('Something went wrong!');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  updateBusinessInfo: (data) => api.put('/users/business-info', data),
  updateFreelancerInfo: (data) => api.put('/users/freelancer-info', data),
  updateBankDetails: (data) => api.put('/users/bank-details', data),
  updateSettings: (data) => api.put('/users/settings', data),
};

// Clients API
export const clientsAPI = {
  getClients: (params) => api.get('/clients', { params }),
  getClient: (id) => api.get(`/clients/${id}`),
  createClient: (data) => api.post('/clients', data),
  updateClient: (id, data) => api.put(`/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/clients/${id}`),
  removeCredentials: (id) => api.delete(`/clients/${id}/credentials`),
  getClientStats: (id) => api.get(`/clients/${id}/stats`),
};

// Invoices API
export const invoicesAPI = {
  getInvoices: (params) => api.get('/invoices', { params }),
  getInvoice: (id) => api.get(`/invoices/${id}`),
  createInvoice: (data) => api.post('/invoices', data),
  updateInvoice: (id, data) => api.put(`/invoices/${id}`, data),
  deleteInvoice: (id) => api.delete(`/invoices/${id}`),
  sendInvoice: (id, data) => api.post(`/invoices/${id}/send`, data),
  recordPayment: (id, data) => api.post(`/invoices/${id}/payment`, data),
  getInvoiceStats: () => api.get('/invoices/stats/overview'),
  downloadInvoicePdf: async (id) => {
    const res = await api.get(`/invoices/${id}/download`, { responseType: 'blob' });
    return res;
  },
};

// Dashboard API
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getRevenueAnalytics: (params) => api.get('/dashboard/analytics/revenue', { params }),
  getClientAnalytics: () => api.get('/dashboard/analytics/clients'),
};

// Templates API
export const templatesAPI = {
  getTemplates: () => api.get('/templates'),
  getTemplate: (id) => api.get(`/templates/${id}`),
};

// Products API
export const productsAPI = {
  list: (params) => api.get('/products', { params }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
};

// (legacy client portal block removed in favor of clientApi-based version below)

export default api;

// Client Portal Axios (separate instance to attach client token)
const clientApi = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } });
clientApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('client_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
clientApi.interceptors.response.use((r) => r, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_profile');
    toast.error('Client session expired. Please login again.');
    window.location.href = '/client/login';
  } else if (error.response?.data?.message) {
    toast.error(error.response.data.message);
  } else {
    toast.error('Something went wrong!');
  }
  return Promise.reject(error);
});

export const clientPortalAPI = {
  invite: (clientId) => api.post('/client-portal/invite', { clientId }),
  // Back-compat alias used by some components
  inviteClient: (clientId) => api.post('/client-portal/invite', { clientId }),
  approve: (data) => api.post('/client-portal/approve', data),
  login: (credentials) => api.post('/client-portal/login', credentials),
  me: () => clientApi.get('/client-portal/me'),
  listInvoices: () => clientApi.get('/client-portal/invoices'),
  submitPaymentRequest: (invoiceId, data) => clientApi.post(`/client-portal/invoices/${invoiceId}/payment-request`, data),
  listPaymentRequests: (params) => api.get('/client-portal/admin/payment-requests', { params }),
  approvePaymentRequest: (id) => api.post(`/client-portal/admin/payment-requests/${id}/approve`),
  rejectPaymentRequest: (id) => api.post(`/client-portal/admin/payment-requests/${id}/reject`),
};