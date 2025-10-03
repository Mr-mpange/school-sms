import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear local storage
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_admin');
      // Redirect to login page
      window.location.href = '/login';
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      throw new Error('Network error. Please check your connection and try again.');
    }

    // Handle other API errors
    const errorMessage = error.response?.data?.message || error.response?.data?.error || 'An error occurred';
    throw new Error(errorMessage);
  }
);

class ApiService {
  // Authentication endpoints
  async register(registerData) {
    const response = await apiClient.post('/auth/register', registerData);
    return response.data;
  }

  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  }

  async logout() {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  }

  async validateSession() {
    const response = await apiClient.get('/auth/validate');
    return response.data;
  }

  async getCurrentAdmin() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }

  // Stats endpoints
  async getStats() {
    const response = await apiClient.get('/stats');
    return response.data;
  }

  async getMessages(params = {}) {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const url = `/stats/messages${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(url);
    return response.data;
  }

  async getParents(params = {}) {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const url = `/stats/parents${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(url);
    return response.data;
  }

  // Message management endpoints
  async createMessage(messageData) {
    const response = await apiClient.post('/messages', messageData);
    return response.data;
  }

  async updateMessage(messageId, messageData) {
    const response = await apiClient.put(`/messages/${messageId}`, messageData);
    return response.data;
  }

  async deleteMessage(messageId) {
    const response = await apiClient.delete(`/messages/${messageId}`);
    return response.data;
  }

  async sendMessage(messageId) {
    const response = await apiClient.post(`/messages/${messageId}/send`);
    return response.data;
  }

  // Parent management endpoints
  async createParent(parentData) {
    const response = await apiClient.post('/parents', parentData);
    return response.data;
  }

  async updateParent(parentId, parentData) {
    const response = await apiClient.put(`/parents/${parentId}`, parentData);
    return response.data;
  }

  async deleteParent(parentId) {
    const response = await apiClient.delete(`/parents/${parentId}`);
    return response.data;
  }

  async importParents(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/parents/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Utility methods
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('sms_token', token);
      apiClient.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('sms_token');
      delete apiClient.defaults.headers.Authorization;
    }
  }

  clearAuth() {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_admin');
    delete apiClient.defaults.headers.Authorization;
  }

  isAuthenticated() {
    return !!localStorage.getItem('sms_token');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
