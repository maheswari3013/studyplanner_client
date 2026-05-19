import API from './axios';

export const scheduleApi = {
  // Schedule CRUD
  getSchedule: () => API.get('/schedule'), // Keep for CalendarView full history
  createBlock: (data) => API.post('/schedule', data),
  updateBlock: (id, data) => API.patch(`/schedule/${id}`, data),
  deleteBlock: (id) => API.delete(`/schedule/${id}`),
  
  // AGENDA - Use this in TodaysAgenda.jsx
  getAgenda: () => API.get('/schedule/pending'), // ✅ NEW - only pending + missed for today
  
  // Plan generation - used in PlanSetup.jsx
  generateSchedule: (params) => API.post('/schedule/generate', params),
  
  // Time logging - used in StudyTimer.jsx, CalendarView.jsx
  logTime: (blockId, actualMinutes) => API.post('/schedule/log', { blockId, actualMinutes }),
  
  // Missed/reschedule - used in CalendarView.jsx
  markMissed: (blockId) => API.patch(`/schedule/${blockId}/missed`), // ✅ Correct
  rescheduleBlock: (blockId, newDate, newTime) => 
    API.patch(`/schedule/${blockId}/reschedule`, { newDate, newTime }),
  
  // Calendar exports - used in CalendarView.jsx
  exportICS: (startDate, endDate) => 
    API.get(`/schedule/export/ics?start=${startDate}&end=${endDate}`, { responseType: 'blob' }),
  syncGoogle: (code) => API.post('/schedule/sync/google', { code }),
  
  // Stats & reports - used in Dashboard.jsx
  getStats: () => API.get('/schedule/stats'),
  getWeeklyReport: (weekStart) => API.get(`/schedule/report/weekly?start=${weekStart}`),
  getTodayBlocks: () => API.get('/schedule/pending') // ✅ Changed from /today to /pending
};

export default scheduleApi;