import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { examApi } from '../api/examApi';
import { scheduleApi } from '../api/scheduleApi';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/exams.css';

const defaultAvailableHours = {
  mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 6, sun: 6
};

function SortableExamCard({ exam, idx, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: exam._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const totalHours = exam.syllabusTopics?.reduce((sum, t) => sum + (t.hours || 0), 0) || 0;
  const isPast = new Date(exam.examDate) < new Date();

  return (
    <div ref={setNodeRef} className={`exam-card-sortable ${isPast? 'past-due' : ''}`} style={style}>
      <div className="exam-card-header">
        <div className="exam-card-header-left">
          <div {...attributes} {...listeners} className="drag-handle" title="Drag to reorder priority">
            ⋮⋮
          </div>
          <div>
            <div className="exam-title-row">
              <h3>{exam.subject}</h3>
              <span className="priority-badge">Priority {idx + 1}</span>
            </div>
            <p className="exam-meta">
              📅 {new Date(exam.examDate).toLocaleDateString()} at {exam.time}
              {exam.location && ` • 📍 ${exam.location}`}
            </p>
          </div>
        </div>
        <button onClick={() => onDelete(exam._id, exam.subject)} className="btn-danger">
          Delete
        </button>
      </div>

      <div className="exam-stats-grid">
        <div>
          <p className="stat-label">Difficulty</p>
          <span className={`difficulty-badge ${exam.difficulty <= 2? 'easy' : exam.difficulty <= 3? 'medium' : 'hard'}`}>
            {exam.difficulty}/5
          </span>
        </div>
        <div>
          <p className="stat-label">Current Prep</p>
          <span className="stat-value">{exam.currentKnowledge}/5</span>
        </div>
        <div>
          <p className="stat-label">Total Hours</p>
          <span className="stat-value">{totalHours}h</span>
        </div>
      </div>

      {exam.syllabusTopics?.length > 0 && (
        <div className="topics-list-section">
          <p className="stat-label">Topics ({exam.syllabusTopics.length})</p>
          <div className="topics-list">
            {exam.syllabusTopics.map((t, i) => (
              <span key={i} className="topic-tag">{t.name} ({t.hours}h)</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Exams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [currentKnowledge, setCurrentKnowledge] = useState(3);
  const [priority, setPriority] = useState(3);
  const [topics, setTopics] = useState([{ name: '', hours: 1 }]);
  const [availableHours, setAvailableHours] = useState({...defaultAvailableHours});
  const [breakRatio, setBreakRatio] = useState({ study: 50, break: 10 });

  // Global schedule config
  const [config, setConfig] = useState({
    startHour: 9,
    endHour: 18,
    startDate: new Date().toISOString().split('T')[0]
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchExams = async () => {
    try {
      const res = await examApi.getExams();
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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id!== over?.id) {
      setExams((items) => {
        const oldIndex = items.findIndex(item => item._id === active.id);
        const newIndex = items.findIndex(item => item._id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        updatePriorities(newItems);
        return newItems;
      });
    }
  };

  const updatePriorities = async (newExams) => {
    try {
      await Promise.all(newExams.map((exam, idx) =>
        examApi.updateExam(exam._id, { priority: idx + 1 })
      ));
      toast.success('Priorities updated');
    } catch (err) {
      toast.error('Failed to update priorities');
    }
  };

  const addTopic = () => setTopics([...topics, { name: '', hours: 1 }]);

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

  const resetForm = () => {
    setSubject('');
    setExamDate('');
    setTime('09:00');
    setLocation('');
    setDifficulty(3);
    setCurrentKnowledge(3);
    setPriority(exams.length + 1);
    setTopics([{ name: '', hours: 1 }]);
    setAvailableHours({...defaultAvailableHours});
    setBreakRatio({ study: 50, break: 10 });
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
      difficulty,
      currentKnowledge,
      priority,
      syllabusTopics: filteredTopics,
      availableHours,
      breakRatio
    };

    try {
      await examApi.createExam(examData);
      toast.success('Exam added');
      setShowForm(false);
      resetForm();
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to add exam');
    }
  };

  const handleDelete = async (id, subject) => {
    if (!window.confirm(`Delete ${subject} and all its study blocks?`)) return;
    try {
      await examApi.deleteExam(id);
      setExams(exams.filter(e => e._id!== id));
      toast.success('Exam deleted');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to delete');
    }
  };

  const handleGenerateAll = async () => {
    if (exams.length === 0) return toast.error('Add at least 1 exam first');
    setGenerating(true);

    try {
      const res = await scheduleApi.generateSchedule({ exams, config });

      if (!res.data.success) {
        res.data.conflicts?.forEach(c => {
          if (c.type === 'TOPIC_IMPOSSIBLE') {
            toast.error(`${c.topicName}: needs ${c.required.toFixed(1)}h, only ${c.maxPossible.toFixed(1)}h possible`, { duration: 6000 });
          } else {
            toast.error(c.message, { duration: 6000 });
          }
        });
        return;
      }

      toast.success(`Generated ${res.data.count} study blocks`);
      navigate('/calendar');
    } catch (err) {
      const conflicts = err.response?.data?.conflicts;
      if (conflicts) {
        conflicts.forEach(c => toast.error(c.message || 'Conflict detected', { duration: 6000 }));
      } else {
        toast.error(err.response?.data?.msg || 'Failed to generate plan');
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="exams-container"><p>Loading...</p></div>;

  return (
    <div className="exams-container">
      <Toaster position="top-right" />
      <div className="exams-header">
        <h2>Your Exams & Study Plan</h2>
        <div className="header-actions">
          <button onClick={() => navigate('/calendar')} className="btn-secondary">
            View Calendar
          </button>
          {exams.length > 0 && (
            <button onClick={handleGenerateAll} disabled={generating} className="btn-generate">
              {generating? 'Generating...' : 'Generate Plan'}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm? 'Cancel' : '+ Add Exam'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="exam-form">
          <h3>Add New Exam</h3>

          <div className="form-row">
            <input type="text" placeholder="Subject *" value={subject} onChange={e => setSubject(e.target.value)} required />
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} required />
          </div>

          <div className="form-row">
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            <input type="text" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
          </div>

          <div className="sliders-section">
            <h4>Assessment</h4>
            <div className="slider-grid">
              <label>Difficulty: {difficulty}/5
                <input type="range" min="1" max="5" value={difficulty} onChange={e => setDifficulty(Number(e.target.value))} />
              </label>
              <label>Current Prep: {currentKnowledge}/5
                <input type="range" min="1" max="5" value={currentKnowledge} onChange={e => setCurrentKnowledge(Number(e.target.value))} />
              </label>
              <label>Priority: {priority}/5
                <input type="range" min="1" max="5" value={priority} onChange={e => setPriority(Number(e.target.value))} />
              </label>
            </div>
          </div>

          <div className="topics-section">
            <h4>Topics to Study *</h4>
            {topics.map((topic, i) => (
              <div key={i} className="topic-row">
                <input type="text" placeholder="Topic name" value={topic.name} onChange={e => updateTopic(i, 'name', e.target.value)} />
                <input type="number" placeholder="Hours" min="0.5" step="0.5" value={topic.hours} onChange={e => updateTopic(i, 'hours', e.target.value)} />
                <button type="button" onClick={() => removeTopic(i)} className="btn-danger-sm">×</button>
              </div>
            ))}
            <button type="button" onClick={addTopic} className="btn-secondary">+ Add Topic</button>
          </div>

          <div className="hours-section">
            <h4>Available Study Hours Per Day</h4>
            <div className="hours-grid">
              {['sun','mon','tue','wed','thu','fri','sat'].map(day => (
                <div key={day} className="hour-input">
                  <label>{day.toUpperCase()}</label>
                  <input type="number" min="0" max="24" value={availableHours[day]} onChange={e => updateAvailableHours(day, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h4>Break Ratio</h4>
            <div className="form-row">
              <label>Study (min):
                <input type="number" min="25" max="120" value={breakRatio.study} onChange={e => setBreakRatio({...breakRatio, study: Number(e.target.value)})} />
              </label>
              <label>Break (min):
                <input type="number" min="5" max="30" value={breakRatio.break} onChange={e => setBreakRatio({...breakRatio, break: Number(e.target.value)})} />
              </label>
            </div>
          </div>

          <button type="submit" className="btn-primary btn-submit">Save Exam</button>
        </form>
      )}

      {exams.length > 0 && (
        <div className="config-section">
          <h4>Global Schedule Settings</h4>
          <div className="form-row">
            <label>Day starts at:
              <input type="number" min="0" max="23" value={config.startHour} onChange={e => setConfig({...config, startHour: Number(e.target.value)})} />
            </label>
            <label>Day ends at:
              <input type="number" min="0" max="23" value={config.endHour} onChange={e => setConfig({...config, endHour: Number(e.target.value)})} />
            </label>
            <label>Start from:
              <input type="date" value={config.startDate} onChange={e => setConfig({...config, startDate: e.target.value})} />
            </label>
          </div>
        </div>
      )}

      {exams.length === 0 &&!showForm? (
        <div className="empty-state">
          <p>No exams yet. Add your first exam with topics and hours.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Exam</button>
        </div>
      ) : (
        <>
          <p className="drag-hint">Drag ⋮⋮ to reorder priority. Higher = studied first.</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={exams.map(e => e._id)} strategy={verticalListSortingStrategy}>
              <div className="exams-list">
                {exams.map((exam, idx) => (
                  <SortableExamCard key={exam._id} exam={exam} idx={idx} onDelete={handleDelete} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}