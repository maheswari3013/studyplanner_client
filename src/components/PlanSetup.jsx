import { useState } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/plansetup.css';

const defaultAvailableHours = {
  mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 6, sun: 6
};

function SortableExam({ exam, idx, updateExam, updateTopic, addTopic, removeTopic, removeExam, updateAvailableHours, updateBreakRatio, applyPreset, examsLength }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: exam.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const updateTopicName = (topicIdx, name) => {
    const newTopics = [...exam.syllabusTopics];
    if (exam.hourMode === 'topic') {
      newTopics[topicIdx] = {...newTopics[topicIdx], name };
    } else {
      newTopics[topicIdx] = name;
    }
    updateExam(idx, 'syllabusTopics', newTopics);
  };

  const updateTopicHours = (topicIdx, hours) => {
    const newTopics = [...exam.syllabusTopics];
    newTopics[topicIdx] = {...newTopics[topicIdx], hours: Number(hours) };
    updateExam(idx, 'syllabusTopics', newTopics);
  };

  return (
    <div ref={setNodeRef} className="exam-card-sortable" style={style}>
      <div className="exam-card-header">
        <div className="exam-card-header-left">
          <div {...attributes} {...listeners} className="drag-handle">
            ⋮⋮
          </div>
          <h3 className="exam-title">Priority {idx + 1}: {exam.subject || 'New Exam'}</h3>
        </div>
        {examsLength > 1 && (
          <button type="button" onClick={() => removeExam(idx)} className="btn-remove-exam">
            Remove Exam
          </button>
        )}
      </div>

      <div className="form-section">
        <h4>1. Exam Details</h4>
        <div className="form-grid-3">
          <input
            className="form-input"
            placeholder="Subject name"
            value={exam.subject}
            onChange={e => updateExam(idx, 'subject', e.target.value)}
            required
          />
          <input
            className="form-input"
            type="date"
            value={exam.date}
            onChange={e => updateExam(idx, 'date', e.target.value)}
            required
          />
          <input
            className="form-input"
            type="time"
            value={exam.time}
            onChange={e => updateExam(idx, 'time', e.target.value)}
          />
        </div>
        <input
          className="form-input"
          placeholder="Location/Exam Hall (optional)"
          value={exam.location}
          onChange={e => updateExam(idx, 'location', e.target.value)}
          style={{marginTop: '12px'}}
        />
      </div>

      <div className="form-grid-3 form-section">
        <label>Difficulty: {exam.difficulty}/5
          <input
            type="range" min="1" max="5"
            value={exam.difficulty}
            onChange={e => updateExam(idx, 'difficulty', Number(e.target.value))}
          />
        </label>
        <label>Current prep: {exam.currentKnowledge}/5
          <input
            type="range" min="1" max="5"
            value={exam.currentKnowledge}
            onChange={e => updateExam(idx, 'currentKnowledge', Number(e.target.value))}
          />
        </label>
        <label>Priority: {exam.priority}
          <select
            value={exam.priority}
            onChange={e => updateExam(idx, 'priority', Number(e.target.value))}
            className="form-select"
          >
            <option value={1}>1 - Highest</option>
            <option value={2}>2 - High</option>
            <option value={3}>3 - Medium</option>
            <option value={4}>4 - Low</option>
            <option value={5}>5 - Lowest</option>
          </select>
        </label>
      </div>

      <div className="form-section">
        <h4>2. Hours Allocation Mode</h4>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              value="subject"
              checked={exam.hourMode === 'subject'}
              onChange={e => {
                updateExam(idx, 'hourMode', 'subject');
                updateExam(idx, 'syllabusTopics', exam.syllabusTopics.map(t => typeof t === 'object'? t.name : t));
              }}
            />
            Hours per Subject
          </label>
          <label className="radio-label">
            <input
              type="radio"
              value="topic"
              checked={exam.hourMode === 'topic'}
              onChange={e => {
                updateExam(idx, 'hourMode', 'topic');
                updateExam(idx, 'totalHours', null);
                const newTopics = exam.syllabusTopics.map(t =>
                  typeof t === 'string'? { name: t, hours: 10 } : t
                );
                updateExam(idx, 'syllabusTopics', newTopics);
              }}
            />
            Hours per Topic
          </label>
        </div>

        {exam.hourMode === 'subject' && (
          <div className="hours-wrapper">
            <label>Total Hours for {exam.subject || 'this subject'}:
              <input
                className="form-input input-mt-4"
                type="number"
                min="1"
                value={exam.totalHours || ''}
                onChange={e => updateExam(idx, 'totalHours', Number(e.target.value))}
                placeholder="e.g. 40"
              />
            </label>
          </div>
        )}
      </div>

      <div className="form-section">
        <h4>Topics/Chapters</h4>
        {exam.syllabusTopics.map((topic, tIdx) => (
          <div key={tIdx} className="topic-row">
            <input
              className="topic-input"
              placeholder={`Topic ${tIdx + 1}`}
              value={exam.hourMode === 'topic'? topic.name : topic}
              onChange={e => updateTopicName(tIdx, e.target.value)}
            />
            {exam.hourMode === 'topic' && (
              <input
                className="hours-input"
                type="number"
                min="0.5"
                step="0.5"
                value={topic.hours || ''}
                onChange={e => updateTopicHours(tIdx, e.target.value)}
                placeholder="Hours"
              />
            )}
            {exam.syllabusTopics.length > 1 && (
              <button type="button" onClick={() => removeTopic(idx, tIdx)} className="btn-remove-topic" title="Remove topic">
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => addTopic(idx)} className="btn-add">+ Add Topic</button>
      </div>

      <div className="form-section">
        <h4>3. Weekly Hours Available</h4>
        <div className="preset-buttons">
          {['weekdays', 'weekends', 'custom'].map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => mode === 'custom'? updateExam(idx, 'availabilityMode', 'custom') : applyPreset(idx, mode)}
              className={`preset-btn ${exam.availabilityMode === mode? 'active' : 'inactive'}`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="hours-grid">
          {Object.entries(exam.availableHours).map(([day, hours]) => (
            <label key={day}>
              {day.charAt(0).toUpperCase() + day.slice(1)}:
              <input
                className={`form-input ${exam.availabilityMode!== 'custom'? 'hours-input-disabled' : ''}`}
                type="number"
                min="0" max="16"
                value={hours}
                onChange={e => updateAvailableHours(idx, day, e.target.value)}
                disabled={exam.availabilityMode!== 'custom'}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h4>4. Break Ratio</h4>
        <div className="form-grid-2">
          <label>Study (min):
            <input
              className="form-input"
              type="number"
              min="25" max="120"
              value={exam.breakRatio.study}
              onChange={e => updateBreakRatio(idx, 'study', e.target.value)}
            />
          </label>
          <label>Break (min):
            <input
              className="form-input"
              type="number"
              min="5" max="30"
              value={exam.breakRatio.break}
              onChange={e => updateBreakRatio(idx, 'break', e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default function PlanSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([
    {
      id: '1',
      subject: '',
      date: '',
      time: '09:00',
      location: '',
      difficulty: 3,
      currentKnowledge: 3,
      priority: 1,
      hourMode: 'subject',
      totalHours: null,
      syllabusTopics: [''],
      availableHours: {...defaultAvailableHours},
      availabilityMode: 'custom',
      breakRatio: { study: 50, break: 10 }
    }
  ]);
  const [config, setConfig] = useState({
    startHour: 9,
    endHour: 18,
    startDate: new Date().toISOString().split('T')[0]
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id!== over.id) {
      setExams((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const updateExam = (idx, field, value) => {
    const newExams = [...exams];
    newExams[idx][field] = value;
    setExams(newExams);
  };

  const updateTopic = (examIdx, topicIdx, value) => {
    const newExams = [...exams];
    newExams[examIdx].syllabusTopics[topicIdx] = value;
    setExams(newExams);
  };

  const addTopic = (examIdx) => {
    const newExams = [...exams];
    const newTopic = exams[examIdx].hourMode === 'topic'
 ? { name: '', hours: 10 }
      : '';
    newExams[examIdx].syllabusTopics.push(newTopic);
    setExams(newExams);
  };

  const removeTopic = (examIdx, topicIdx) => {
    const newExams = [...exams];
    if (newExams[examIdx].syllabusTopics.length <= 1) return;
    newExams[examIdx].syllabusTopics.splice(topicIdx, 1);
    setExams(newExams);
  };

  const removeExam = (idx) => {
    if (exams.length <= 1) return;
    const newExams = exams.filter((_, i) => i!== idx);
    setExams(newExams);
  };

  const updateAvailableHours = (examIdx, day, value) => {
    const newExams = [...exams];
    newExams[examIdx].availableHours[day] = Number(value);
    newExams[examIdx].availabilityMode = 'custom';
    setExams(newExams);
  };

  const updateBreakRatio = (examIdx, field, value) => {
    const newExams = [...exams];
    newExams[examIdx].breakRatio[field] = Number(value);
    setExams(newExams);
  };

  const applyPreset = (examIdx, mode, weekdayHours = 4, weekendHours = 6) => {
    const newExams = [...exams];
    newExams[examIdx].availabilityMode = mode;
    if (mode === 'weekdays') {
      newExams[examIdx].availableHours = {
        mon: weekdayHours, tue: weekdayHours, wed: weekdayHours,
        thu: weekdayHours, fri: weekdayHours, sat: 0, sun: 0
      };
    } else if (mode === 'weekends') {
      newExams[examIdx].availableHours = {
        mon: 0, tue: 0, wed: 0, thu: 0, fri: 0,
        sat: weekendHours, sun: weekendHours
      };
    }
    setExams(newExams);
  };

  const addExam = () => {
    setExams([...exams, {
      id: Date.now().toString(),
      subject: '',
      date: '',
      time: '09:00',
      location: '',
      difficulty: 3,
      currentKnowledge: 3,
      priority: exams.length + 1,
      hourMode: 'subject',
      totalHours: null,
      syllabusTopics: [''],
      availableHours: {...defaultAvailableHours},
      availabilityMode: 'custom',
      breakRatio: { study: 50, break: 10 }
    }]);
  };

  const handleConfigChange = (e) => {
    setConfig({...config, [e.target.name]: Number(e.target.value) || e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // STEP 1: Save all exams to DB first
      const savedExams = [];
      for (let i = 0; i < exams.length; i++) {
        const exam = exams[i];
       const examPayload = {
  subject: exam.subject,
  examDate: exam.date,
  time: exam.time,
  location: exam.location,
  difficulty: exam.difficulty,
  currentKnowledge: exam.currentKnowledge,
  priority: i + 1,
  totalHours: exam.hourMode === 'subject'? exam.totalHours : undefined,
  syllabusTopics: exam.hourMode === 'topic'  // ← THIS LINE
    ? exam.syllabusTopics.filter(t => t.name?.trim())
    : exam.syllabusTopics.filter(t => typeof t === 'string' && t.trim()).map(name => ({ name, hours: 1 })),
  availableHours: exam.availableHours,
  breakRatio: exam.breakRatio
};

        const res = await API.post('/exams', examPayload);
        savedExams.push(res.data);
        toast.success(`Saved ${exam.subject}`);
      }

      // STEP 2: Generate schedule using saved exams
      const schedulePayload = {
        exams: savedExams,
        config
      };

      const res = await API.post('/schedule/generate', schedulePayload);

      if (!res.data.success) {
        res.data.conflicts?.forEach(c => {
          if (c.type === 'TOPIC_IMPOSSIBLE') {
            toast.error(
              `${c.topicName} needs ${c.required.toFixed(1)}h but only ${c.maxPossible.toFixed(1)}h available. ${c.daysBeforeExam} days at max ${c.maxDailyHours}h/day.`,
              { duration: 6000 }
            );
          }
          if (c.type === 'INSUFFICIENT_TIME') {
            toast.error(`Need ${c.deficit.toFixed(1)} more hours total. Add daily hours or reduce scope.`, { duration: 6000 });
          }
        });
        return;
      }

      toast.success(`Generated ${res.data.count} study blocks`);
      navigate('/calendar');
    } catch (err) {
      console.error('Generate error:', err.response?.data);
      const conflicts = err.response?.data?.conflicts;
      if (conflicts) {
        conflicts.forEach(c => {
          if (c.type === 'TOPIC_IMPOSSIBLE') {
            toast.error(`${c.topicName}: ${c.required.toFixed(1)}h needed, ${c.maxPossible.toFixed(1)}h possible`, { duration: 6000 });
          } else {
            toast.error(c.message, { duration: 6000 });
          }
        });
      } else {
        toast.error(err.response?.data?.msg || 'Failed to save exams or generate plan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="plansetup-container">
      <Toaster position="top-right" />
      <h2>Study Planner Setup</h2>
      <p className="plansetup-subtitle">
        Drag ⋮⋮ to reorder priority. Exams are saved when you generate the plan.
      </p>
      <form onSubmit={handleSubmit}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={exams.map(e => e.id)} strategy={verticalListSortingStrategy}>
            {exams.map((exam, idx) => (
              <SortableExam
                key={exam.id}
                exam={exam}
                idx={idx}
                updateExam={updateExam}
                updateTopic={updateTopic}
                addTopic={addTopic}
                removeTopic={removeTopic}
                removeExam={removeExam}
                updateAvailableHours={updateAvailableHours}
                updateBreakRatio={updateBreakRatio}
                applyPreset={applyPreset}
                examsLength={exams.length}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button type="button" onClick={addExam} className="btn-add">+ Add Another Exam</button>

        <h3 className="global-settings">Global Schedule Settings</h3>
        <div className="form-grid-3">
          <label>Day starts at:
            <input type="number" name="startHour" min="0" max="23" value={config.startHour} onChange={handleConfigChange} className="form-input" />
          </label>
          <label>Day ends at:
            <input type="number" name="endHour" min="0" max="23" value={config.endHour} onChange={handleConfigChange} className="form-input" />
          </label>
          <label>Start from:
            <input type="date" name="startDate" value={config.startDate} onChange={handleConfigChange} className="form-input" />
          </label>
        </div>

        <button type="submit" disabled={loading} className="btn-generate">
          {loading? 'Saving Exams & Generating...' : 'Save Exams + Generate Plan'}
        </button>
      </form>
    </div>
  );
}