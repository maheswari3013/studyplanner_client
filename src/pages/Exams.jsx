import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/exams.css';

const getAuthConfig = () => ({
  headers: { 'x-auth-token': localStorage.getItem('token') }
});

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchExams = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/schedule/exams', getAuthConfig());
      setExams(res.data);
    } catch (err) {
      console.error(err);
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
      await axios.delete(`http://localhost:5000/api/schedule/exams/${id}`, getAuthConfig());
      fetchExams();
    } catch (err) {
      alert('Failed to delete exam');
    }
  };

  const getDifficultyClass = (val) => {
    if (val <= 2) return 'easy';
    if (val <= 4) return 'medium';
    return 'hard';
  };

  const renderTopics = (exam) => {
    const hasHours = exam.syllabusTopics?.some(t => typeof t === 'object' && t.hours);
    if (hasHours) {
      return exam.syllabusTopics.map((topic, idx) => (
        <span key={idx} className="topic-tag">
          {topic.name} ({topic.hours}h)
        </span>
      ));
    }
    return exam.syllabusTopics.map((topic, idx) => (
      <span key={idx} className="topic-tag">
        {typeof topic === 'string'? topic : topic.name}
      </span>
    ));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="exams-container">
      <div className="exams-header">
        <h2>My Exams</h2>
        <button onClick={() => navigate('/setup')} className="btn-primary">
          + Add Exam
        </button>
      </div>

      {exams.length === 0? (
        <div className="empty-state">
          <p>No exams yet. Create your first study plan.</p>
          <button onClick={() => navigate('/setup')} className="btn-primary" style={{ marginTop: '12px' }}>
            Go to Setup
          </button>
        </div>
      ) : (
        exams.map(exam => (
          <div key={exam._id} className={`exam-card ${exam.daysLeft < 0? 'past-due' : ''}`}>
            <div className="exam-card-header">
              <div style={{ flex: 1 }}>
                <div className="exam-title-row">
                  <h3>{exam.subject}</h3>
                  <span className="priority-badge">
                    Priority {exam.priority || 3}
                  </span>
                </div>
                <p className="exam-meta">
                  📅 {new Date(exam.examDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  {exam.daysLeft >= 0? (
                    <span className={`days-left ${exam.daysLeft < 7? 'urgent' : ''}`}>
                      {exam.daysLeft} days left
                    </span>
                  ) : (
                    <span className="days-left urgent">Past due</span>
                  )}
                </p>
                {exam.totalHours && (
                  <p className="mode-info">
                    Mode: Subject Total - {exam.totalHours}h split across {exam.syllabusTopics.length} topics
                  </p>
                )}
              </div>
              <button onClick={() => handleDelete(exam._id, exam.subject)} className="btn-danger">
                Delete
              </button>
            </div>

            <div className="exam-stats-grid">
              <div>
                <p className="stat-label">Difficulty</p>
                <div className={`difficulty-badge ${getDifficultyClass(exam.difficulty)}`}>
                  {exam.difficulty}/5
                </div>
              </div>
              <div>
                <p className="stat-label">Current Prep</p>
                <div className="stat-value">{exam.currentKnowledge}/5</div>
              </div>
              <div>
                <p className="stat-label">Scheduled</p>
                <div className="stat-value">{exam.totalScheduledHours?.toFixed(1) || 0}h</div>
              </div>
            </div>

            <div className="progress-section">
              <p className="stat-label">
                Progress: {exam.completedHours?.toFixed(1) || 0}h / {exam.totalScheduledHours?.toFixed(1) || 0}h
              </p>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${exam.progress === 100? 'complete' : ''}`}
                  style={{ width: `${exam.progress || 0}%` }}
                />
              </div>
              <p className="progress-text">{exam.progress || 0}% complete</p>
            </div>

            <div className="topics-section">
              <p className="stat-label">Topics ({exam.syllabusTopics.length})</p>
              <div className="topics-list">
                {renderTopics(exam)}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}