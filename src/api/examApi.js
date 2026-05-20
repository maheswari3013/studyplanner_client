import API from './axios';

export const examApi = {
  getExams: () => API.get('/exams'),
  getExam: (id) => API.get(`/exams/${id}`),
  createExam: (data) => API.post('/exams', data),
  updateExam: (id, data) => API.put(`/exams/${id}`, data), // Changed PATCH → PUT
  deleteExam: (id) => API.delete(`/exams/${id}`),
  
  // Remove these if you deleted PlanSetup.jsx
  // getExamSubjects: (examId) => API.get(`/exams/${examId}/subjects`),
  // updateSubjects: (examId, subjects) => API.put(`/exams/${examId}/subjects`, { subjects }),
  
  // Keep if you still use progress tracking
  getExamProgress: (examId) => API.get(`/exams/${examId}/progress`),
  updateTopicProgress: (examId, topicId, completed) => 
    API.patch(`/exams/${examId}/topics/${topicId}`, { completed })
};

export default examApi;