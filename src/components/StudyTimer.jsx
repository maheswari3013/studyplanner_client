import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { examApi } from '../api/examApi';
import { scheduleApi } from '../api/scheduleApi';
import toast, { Toaster } from 'react-hot-toast';
import { CalendarDays, GripVertical, MapPin, X } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import StyledButton from '../components/StyledButton';
import '../assets/exams.css';

const defaultAvailableHours = {
  mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 6, sun: 6
};

function SortableExam({ exam, idx, onDelete, onEdit, onUpdateConfidence, editingExam }) {
  const sortable = useSortable({
    id: exam?._id || `temp-${idx}`,
    disabled:!exam?._id ||!!editingExam
  });

  if (!exam?._id ||!sortable) return null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable || {};

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging? 0.5 : 1,
    zIndex: isDragging? 999 : 1,
    cursor: isDragging? 'grabbing' : 'default'
  };

  const totalHours = exam.syllabusTopics?.reduce((sum, t) => sum + (t.hours || 0), 0) || exam.totalHours || 0;
  const isPast = new Date(exam.examDate) < new Date(new Date().setHours(0,0,0,0));
  const confidence = exam.confidenceLevel?? 0;

  const confidenceColors = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E'];
  const confidenceLabels = ['None', 'Low', 'Medium', 'High', 'Very High'];

  return (
    <div ref={setNodeRef} className={`exam-card-sortable ${isPast? 'past-due' : ''} ${isDragging? 'dragging' : ''}`} style={style}>
      <div className="exam-card-header">
        <div className="exam-card-header-left">
          <div
            {...(attributes || {})}
            {...(listeners || {})}
            className="drag-handle"
            title="Drag to reorder priority"
            style={{ pointerEvents: editingExam? 'none' : 'auto' }}
          >
            <GripVertical size={18} />
          </div>
          <div>
            <div className="exam-title-row">
              <h3>{exam.subject}</h3>
              <span className="priority-badge">Priority {idx + 1}</span>
            </div>
            <p className="exam-meta">
              <CalendarDays size={14} /> {new Date(exam.examDate).toLocaleDateString()} at {exam.time}
              {exam.location && (<> <span aria-hidden="true">&bull;</span> <MapPin size={14} /> {exam.location} </>)}
            </p>
          </div>
        </div>
        <div className="exam-card-actions">
          <button onClick={() => onEdit(exam)} className="btn-secondary">
            Edit
          </button>
          <button onClick={() => onDelete(exam._id, exam.subject)} className="btn-danger">
            Delete
          </button>
        </div>
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

      <div className="confidence-section">
        <p className="stat-label">Confidence Level</p>
        <div className="confidence-buttons">
          {[0,1,2,3,4].map(level => (
            <button
              key={level}
              onClick={() => onUpdateConfidence(exam._id, level)}
              className={`confidence-btn ${confidence === level? 'active' : ''}`}
              style={{
                backgroundColor: confidence === level? confidenceColors[level] : '#E5E7EB',
                color: confidence === level? '#fff' : '#6B7280'
              }}
              title={confidenceLabels[level]}
            >
              {level}
            </button>
          ))}
          <span className="confidence-label" style={{ color: confidenceColors[confidence] }}>
            {confidenceLabels[confidence]}
          </span>
        </div>
      </div>

      {exam.syllabusTopics?.length > 0 && (
        <div className="topics-list-section">
          <p className="stat-label">Topics ({exam.syllabusTopics.length})</p>
          <div className="topics-list">
            {exam.syllabusTopics.map((t, i) => (
              <span key={i} className="topic-tag">
                {t.name} {t.hours? `(${t.hours}h)` : ''}
              </span>
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
  const [editingExam, setEditingExam] = useState(null);

  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [currentKnowledge, setCurrentKnowledge] = useState(3);
  const [priority, setPriority] = useState(3);
  const [hourMode, setHourMode] = useState('topic');
  const [totalHours, setTotalHours] = useState(10);
  const [topics, setTopics] = useState([{ name: '', hours: 1 }]);
  const [availableHours, setAvailableHours] = useState({...defaultAvailableHours });
  const [hoursPreset, setHoursPreset] = useState('custom');
  const [breakRatio, setBreakRatio] = useState({ study: 50, break: 10 });

  const [config, setConfig] = useState({
    startHour: 0,
    endHour: 23,
    startDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const fetchExams = async () => {
    try {
      const res = await examApi.getExams();
      setExams(res.data);
    } catch {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetchExams);
  }, []);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exams.findIndex(item => item._id === active.id);
    const newIndex = exams.findIndex(item => item._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousExams = exams;
    const newExams = arrayMove(exams, oldIndex, newIndex);
    const orderedIds = newExams.map(exam => exam._id);

    setExams(newExams);
    try {
      const res = await examApi.reorderExams(orderedIds);
      if (res.status === 200) {
        toast.success('Priority updated');
      } else {
        setExams(previousExams);
        toast.error('Failed to save order');
      }
    } catch {
      setExams(previousExams);
      toast.error('Failed to save order');
    }
  };

  const handleUpdateConfidence = async (examId, level) => {
    try {
      await examApi.updateConfidence(examId, level);
      setExams(prev => prev.map(e => e._id === examId? {...e, confidenceLevel: level} : e));
      toast.success('Confidence updated');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to update confidence');
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

  const applyHoursPreset = (preset) => {
    setHoursPreset(preset);
    if (preset === 'weekday') {
      setAvailableHours({ mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 0, sun: 0 });
    } else if (preset === 'weekend') {
      setAvailableHours({ mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 6, sun: 6 });
    }
  };

  const updateAvailableHours = (day, hours) => {
    setHoursPreset('custom');
    setAvailableHours({...availableHours, [day]: Number(hours) });
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setSubject(exam.subject);
    setExamDate(exam.examDate.split('T')[0]);
    setTime(exam.time || '09:00');
    setLocation(exam.location || '');
    setDifficulty(exam.difficulty || 3);
    setCurrentKnowledge(exam.currentKnowledge || 3);
    setPriority(exam.priority || 3);
    setHourMode(exam.totalHours? 'subject' : 'topic');
    setTotalHours(exam.totalHours || 10);
    setTopics(exam.syllabusTopics?.length? exam.syllabusTopics : [{ name: '', hours: 1 }]);
    setAvailableHours(exam.availableHours || {...defaultAvailableHours });
    setBreakRatio(exam.breakRatio || { study: 50, break: 10 });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingExam(null);
    setSubject('');
    setExamDate('');
    setTime('09:00');
    setLocation('');
    setDifficulty(3);
    setCurrentKnowledge(3);
    setPriority(exams.length + 1);
    setHourMode('topic');
    setTotalHours(10);
    setTopics([{ name: '', hours: 1 }]);
    setAvailableHours({...defaultAvailableHours });
    setHoursPreset('custom');
    setBreakRatio({ study: 50, break: 10 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedDate = new Date(examDate);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (selectedDate < today) {
      return toast.error('Exam date cannot be in the past');
    }

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
      totalHours: hourMode === 'subject'? totalHours : undefined,
      syllabusTopics: hourMode === 'topic'
   ? filteredTopics
        : filteredTopics.map(t => ({ name: t.name, hours: totalHours / filteredTopics.length })),
      availableHours,
      breakRatio
    };

    try {
      if (editingExam) {
        await examApi.updateExam(editingExam._id, examData);
        toast.success('Exam updated');
      } else {
        await examApi.createExam(examData);
        toast.success('Exam added');
      }
      setShowForm(false);
      resetForm();
      fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to save exam');
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
      const res = await scheduleApi.generateSchedule({
        exams,
        startHour: parseInt(config.startHour),
        endHour: parseInt(config.endHour),
        startDate: config.startDate,
        breakRatio
      });

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

  const validExams = exams.filter(e => e && e._id && typeof e._id === 'string');

  return (
    <DashboardLayout>
    <div className="exams-container">
      <Toaster position="top-right" />
      <div className="exams-header">
        <h2>Your Exams & Study Plan</h2>
        <div className="header-actions">
          <StyledButton onClick={() => navigate('/calendar')}>
            View Calendar
          </StyledButton>
          {validExams.length > 0 && (
            <StyledButton variant="generate" onClick={handleGenerateAll} disabled={generating}>
              {generating? 'Generating...' : 'Generate Plan'}
            </StyledButton>
          )}
          <StyledButton variant="primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm? 'Cancel' : '+ Add Exam'}
          </StyledButton>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="exam-form">
          <h3>{editingExam? 'Edit Exam' : 'Add New Exam'}</h3>

          <div className="form-row">
            <input type="text" placeholder="Subject *" value={subject} onChange={e => setSubject(e.target.value)} required />
            <input
              type="date"
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
              required
            />
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
            <div className="topics-header">
              <h4>Topics to Study *</h4>
              <div className="hour-mode-toggle">
                <button
                  type="button"
                  className={hourMode === 'subject'? 'active' : ''}
                  onClick={() => setHourMode('subject')}
                >
                  Total Hours
                </button>
                <button
                  type="button"
                  className={hourMode === 'topic'? 'active' : ''}
                  onClick={() => setHourMode('topic')}
                >
                  Per Topic
                </button>
              </div>
            </div>

            {hourMode === 'subject' && (
              <div className="form-row">
                <input
                  type="number"
                  placeholder="Total hours for exam"
                  min="1"
                  value={totalHours}
                  onChange={e => setTotalHours(Number(e.target.value))}
                />
              </div>
            )}

            {topics.map((topic, i) => (
              <div key={i} className="topic-row">
                <input
                  type="text"
                  placeholder="Topic name"
                  value={topic.name}
                  onChange={e => updateTopic(i, 'name', e.target.value)}
                />
                {hourMode === 'topic' && (
                  <input
                    type="number"
                    placeholder="Hours"
                    min="0.5"
                    step="0.5"
                    value={topic.hours}
                    onChange={e => updateTopic(i, 'hours', e.target.value)}
                  />
                )}
                <button type="button" onClick={() => removeTopic(i)} className="btn-danger-sm"><X size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={addTopic} className="btn-secondary">+ Add Topic</button>
          </div>

          <div className="hours-section">
            <div className="hours-header">
              <h4>Available Study Hours Per Day</h4>
              <div className="hour-mode-toggle">
                <button
                  type="button"
                  className={hoursPreset === 'weekday'? 'active' : ''}
                  onClick={() => applyHoursPreset('weekday')}
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  className={hoursPreset === 'weekend'? 'active' : ''}
                  onClick={() => applyHoursPreset('weekend')}
                >
                  Weekends
                </button>
                <button
                  type="button"
                  className={hoursPreset === 'custom'? 'active' : ''}
                  onClick={() => setHoursPreset('custom')}
                >
                  Custom
                </button>
              </div>
              </div>
            <div className="hours-grid">
              {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => (
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
                <input type="number" min="25" max="120" value={breakRatio.study} onChange={e => setBreakRatio({...breakRatio, study: Number(e.target.value) })} />
              </label>
              <label>Break (min):
                <input type="number" min="5" max="30" value={breakRatio.break} onChange={e => setBreakRatio({...breakRatio, break: Number(e.target.value) })} />
              </label>
            </div>
          </div>

          <button type="submit" className="btn-primary btn-submit">
            {editingExam? 'Update Exam' : 'Save Exam'}
          </button>
        </form>
      )}

      {validExams.length > 0 && (
        <GlassCard className="config-section">
          <h4>Global Schedule Settings</h4>
          <div className="form-row">
            <label>Day starts at:
              <input type="number" min="0" max="23" value={config.startHour} onChange={e => setConfig({...config, startHour: Number(e.target.value) })} />
            </label>
            <label>Day ends at:
              <input type="number" min="0" max="23" value={config.endHour} onChange={e => setConfig({...config, endHour: Number(e.target.value) })} />
            </label>
            <label>Start from:
              <input type="date" value={config.startDate} onChange={e => setConfig({...config, startDate: e.target.value })} />
            </label>
          </div>
          <small>For full day use 0 to 23. For overnight use like 22 to 6.</small>
        </GlassCard>
      )}

      {validExams.length === 0 &&!showForm? (
        <div className="empty-state">
          <p>No exams yet. Add your first exam with topics and hours.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Exam</button>
        </div>
      ) : (
        <>
          <p className="drag-hint">Drag the handle to reorder priority. Higher = studied first.</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={validExams.map(e => e._id)} strategy={verticalListSortingStrategy}>
              <div className="exams-list">
                {validExams.map((exam, idx) => (
                  <SortableExam
                    key={exam._id}
                    exam={exam}
                    idx={idx}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onUpdateConfidence={handleUpdateConfidence}
                    editingExam={editingExam}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
    </DashboardLayout>
  );
}