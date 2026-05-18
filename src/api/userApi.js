import API from './axios';

export const userApi = {
  // Profile - used in Profile.jsx
  getProfile: () => API.get('/user/profile'),
  updateProfile: (data) => API.patch('/user/profile', data),
  updatePassword: (data) => API.patch('/user/password', data),
  
  // Study preferences - used in PlanSetup.jsx
  getStudyPrefs: () => API.get('/user/study-preferences'),
  updateStudyPrefs: (data) => API.patch('/user/study-preferences', data),
  
  // User stats - used in Dashboard.jsx, Profile.jsx
  getUserStats: () => API.get('/user/stats'),
  getStreak: () => API.get('/user/streak'),
  getAnalytics: (period) => API.get(`/user/analytics?period=${period}`),

  // Add these inside export const userApi = { ... }

login: (credentials) => API.post('/auth/login', credentials),
register: (data) => API.post('/auth/register', data),
  
  // Account management - used in Profile.jsx
  deleteAccount: () => API.delete('/user/account'),
  exportUserData: () => API.get('/user/export', { responseType: 'blob' }),
  
  // Admin endpoints - used in AdminDashboard.jsx
  getAdminStats: () => API.get('/admin/stats'),
  getAllUsers: () => API.get('/admin/users'),
  getUserDetails: (userId) => API.get(`/admin/users/${userId}`),
  deleteUser: (userId) => API.delete(`/admin/users/${userId}`),
  resetUserData: (userId) => API.post(`/admin/users/${userId}/reset`),
  getUserActivity: (userId) => API.get(`/admin/users/${userId}/activity`),
  toggleUserStatus: (userId, active) => API.patch(`/admin/users/${userId}/status`, { active })
};

export default userApi;