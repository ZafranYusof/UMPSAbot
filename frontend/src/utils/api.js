import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Chat API
export const chatAPI = {
  sendMessage: (message, conversationId = null, language = null) =>
    api.post('/chat/send', { message, conversationId, language }),
  
  getConversation: (conversationId) =>
    api.get(`/chat/conversations/${conversationId}`),
  
  listConversations: () =>
    api.get('/chat/conversations'),
  
  deleteConversation: (conversationId) =>
    api.delete(`/chat/conversations/${conversationId}`),

  sendFeedback: ({ messageId, conversationId, feedback }) =>
    api.post('/chat/feedback', { messageId, conversationId, feedback })
};

// Documents API
export const documentsAPI = {
  upload: (file, metadata) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.language) formData.append('language', metadata.language);
    
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  list: (params = {}) =>
    api.get('/documents', { params }),
  
  get: (id) =>
    api.get(`/documents/${id}`),
  
  delete: (id) =>
    api.delete(`/documents/${id}`),
  
  getStats: () =>
    api.get('/documents/stats')
};

// Auth API
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  
  register: (data) =>
    api.post('/auth/register', data),
  
  getProfile: (userId) =>
    api.get(`/auth/profile/${userId}`)
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
