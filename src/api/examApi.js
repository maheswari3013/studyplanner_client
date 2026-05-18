import API from './axios';

export const examApi = {
  // Exams CRUD - used in Exams.jsx, PlanSetup.jsx
  getExams: () => API.get('/exams'),
  getExam: (id) => API.get(`/exams/${id}`),
  createExam: (data) => API.post('/exams', data),
  updateExam: (id, data) => API.patch(`/exams/${id}`, data),
  deleteExam: (id) => API.delete(`/exams/${id}`),
  
  // Exam subjects/topics - used in PlanSetup.jsx
  getExamSubjects: (examId) => API.get(`/exams/${examId}/subjects`),
  updateSubjects: (examId, subjects) => API.put(`/exams/${examId}/subjects`, { subjects }),
  
  // Progress tracking
  getExamProgress: (examId) => API.get(`/exams/${examId}/progress`),
  updateTopicProgress: (examId, topicId, completed) => 
    API.patch(`/exams/${examId}/topics/${topicId}`, { completed })
};

export default examApi;