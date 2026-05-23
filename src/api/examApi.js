import API from './axios';

export const examApi = {
  getExams: () => API.get('/exams'),
  getExam: (id) => API.get(`/exams/${id}`),
  createExam: (data) => API.post('/exams', data),
  updateExam: (id, data) => API.put(`/exams/${id}`, data),
  deleteExam: (id) => API.delete(`/exams/${id}`),
  reorderExams: (orderedIds) => API.patch('/exams/reorder', { orderedIds }),

  
  getExamProgress: (examId) => API.get(`/exams/${examId}/progress`),
  updateConfidence: (id, level) => API.patch(`/exams/${id}/confidence`, { level }),
  updateTopicProgress: (examId, topicId, completed) => 
    API.patch(`/exams/${examId}/topics/${topicId}`, { completed })
};

export default examApi;
