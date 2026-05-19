import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/exams.css';

export default function Exams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    try {
      const res = await API.get('/exams');
      setExams(res.data);
    } catch (err) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async (id, subject) => {
    if (!window.confirm(`Delete ${subject} and all its study blocks?`)) return;
    
    try {
      await API.delete(`/exams/${id}`);
      setExams(exams.filter(e => e._id !== id));
      toast.success('Exam deleted');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to delete');
    }
  };

  if (loading) return <div className="exams-container"><p>Loading...</p></div>;

  return (
    <div className="exams-container">
      <Toaster position="top-right" />
      <div className="exams-header">
        <h2>Your Exams</h2>
        <div className="header-actions">
          <button onClick={() => navigate('/calendar')} className="btn-secondary">
            View Calendar
          </button>
          <button onClick={() => navigate('/setup')} className="btn-primary">
            + Create Exam & Plan
          </button>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="empty-state">
          <p>No exams yet. Create your first exam and study plan.</p>
          <button onClick={() => navigate('/setup')} className="btn-primary">
            + Create Exam & Plan
          </button>
        </div>
      ) : (
        <div className="exams-list">
          {exams.map(exam => (
            <div key={exam._id} className="exam-card">
              <div className="exam-info">
                <h3>{exam.subject}</h3>
                <p>📅 {new Date(exam.examDate).toLocaleDateString()} at {exam.time}</p>
                {exam.location && <p>📍 {exam.location}</p>}
                <p>Difficulty: {exam.difficulty}/5 | Priority: {exam.priority}/5</p>
              </div>
              <button 
                onClick={() => handleDelete(exam._id, exam.subject)} 
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}