import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/exams.css';

export default function Exams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [topics, setTopics] = useState([{ name: '', hours: 1 }]);
  const [availableHours, setAvailableHours] = useState({
    sun: 4, mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 6
  });

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

  const addTopic = () => {
    setTopics([...topics, { name: '', hours: 1 }]);
  };

  const updateTopic = (index, field, value) => {
    const newTopics = [...topics];
    newTopics[index][field] = field === 'hours'? Number(value) : value;
    setTopics(newTopics);
  };

  const removeTopic = (index) => {
    if (topics.length === 1) return toast.error('Need at least 1 topic');
    setTopics(topics.filter((_, i) => i!== index));
  };

  const updateAvailableHours = (day, hours) => {
    setAvailableHours({...availableHours, [day]: Number(hours) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const filteredTopics = topics.filter(t => t.name.trim()!== '');
    if (filteredTopics.length === 0) {
      return toast.error('Add at least 1 topic');
    }

    const examData = {
      subject,
      examDate,
      time,
      location,
      syllabusTopics: filteredTopics,
      availableHours,
      difficulty: 3,
      currentKnowledge: 3,
      priority: 3,
      breakRatio: { study: 25, break: 5 }
    };

    try {
      await API.post('/exams', examData);
      toast.success('Exam added');
      setShowForm(false);
      // Reset form
      setSubject('');
      setExamDate('');
      setTime('09:00');
      setLocation('');
      setTopics([{ name: '', hours: 1 }]);
      setAvailableHours({ sun: 4, mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 6 });
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to add exam');
    }
  };

  const handleDelete = async (id, subject) => {
    if (!window.confirm(`Delete ${subject} and all its study blocks?`)) return;

    try {
      await API.delete(`/exams/${id}`);
      setExams(exams.filter(e => e._id!== id));
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
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm? 'Cancel' : '+ Add Exam'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="exam-form">
          <h3>Add New Exam</h3>

          <div className="form-row">
            <input
              type="text"
              placeholder="Subject *"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
            />
            <input
              type="date"
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
            <input
              type="text"
              placeholder="Location"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div className="topics-section">
            <h4>Topics to Study *</h4>
            {topics.map((topic, i) => (
              <div key={i} className="topic-row">
                <input
                  type="text"
                  placeholder="Topic name"
                  value={topic.name}
                  onChange={e => updateTopic(i, 'name', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Hours"
                  min="0.5"
                  step="0.5"
                  value={topic.hours}
                  onChange={e => updateTopic(i, 'hours', e.target.value)}
                />
                <button type="button" onClick={() => removeTopic(i)} className="btn-danger-sm">
                  X
                </button>
              </div>
            ))}
            <button type="button" onClick={addTopic} className="btn-secondary">
              + Add Topic
            </button>
          </div>

          <div className="hours-section">
            <h4>Available Study Hours Per Day</h4>
            <div className="hours-grid">
              {['sun','mon','tue','wed','thu','fri','sat'].map(day => (
                <div key={day} className="hour-input">
                  <label>{day.toUpperCase()}</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={availableHours[day]}
                    onChange={e => updateAvailableHours(day, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary">Save Exam</button>
        </form>
      )}

      {exams.length === 0 &&!showForm? (
        <div className="empty-state">
          <p>No exams yet. Create your first exam and study plan.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add Exam
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
                <p>Topics: {exam.syllabusTopics?.length || 0} | Total: {exam.syllabusTopics?.reduce((sum, t) => sum + t.hours, 0) || 0}h</p>
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