import API from './axios';

export const scheduleApi = {
  // Schedule CRUD
  getSchedule: () => API.get('/schedule'),
  createBlock: (data) => API.post('/schedule', data),
  updateBlock: (id, data) => API.patch(`/schedule/${id}`, data),
  deleteBlock: (id) => API.delete(`/schedule/${id}`),
  
  // Agenda - for TodaysAgenda.jsx
  getAgenda: () => API.get('/schedule/pending'),
  getTodayBlocks: () => API.get('/schedule/today'),
  
  // Plan generation - used in Exams.jsx
  generateSchedule: (params) => API.post('/schedule/generate', params),
  
  // Block actions
  completeBlock: async (blockId) => {
    try {
      return await API.patch(`/schedule/${blockId}/complete`);
    } catch (err) {
      if (err.response?.status === 404) {
        return { notFound: true, error: err };
      }
      throw err;
    }
  },
  markMissed: async (blockId) => {
    try {
      return await API.patch(`/schedule/${blockId}/missed`);
    } catch (err) {
      if (err.response?.status === 404) {
        return { notFound: true, error: err };
      }
      throw err;
    }
  },
  markPending: (blockId) => API.patch(`/schedule/${blockId}/pending`),
  startBlock: (blockId) => API.post(`/schedule/${blockId}/start`),
  
  // Reschedule
  rescheduleBlock: (blockId, newDate, newTime) => 
    API.patch(`/schedule/${blockId}/reschedule`, { newDate, newTime }),
  
  // Calendar exports
  exportPDF: (startDate, endDate) => 
    API.get(`/schedule/export/pdf?start=${startDate}&end=${endDate}`, { responseType: 'blob' }),
  exportJSON: () => API.get('/schedule/export'),
  syncGoogle: () => API.post('/schedule/google/sync'),
  disconnectGoogle: () => API.delete('/auth/google/disconnect'),
  getGoogleAuthUrl: () => API.get('/schedule/google/auth'), // Backend callback is now /auth/google/callback
  
  // Stats & reports
  getStats: () => API.get('/schedule/stats'),
  getExamsWithStats: () => API.get('/schedule/exams'),
  getProgress: () => API.get('/schedule/progress'),
  getReadiness: () => API.get('/schedule/readiness'),
  getAffirmation: () => API.get('/schedule/affirmation'),
  
  // User settings
  updateConfidence: (subject, level) => API.patch('/schedule/user/confidence', { subject, level }),
  
  // Clear all
  clearAll: () => API.delete('/schedule/clear-all'),

  // Error 3 + Request 1: Admin endpoints
  getAdminUsers: () => API.get('/schedule/admin/users'),
  getAdminStats: () => API.get('/schedule/admin/stats')
};

export default scheduleApi;
