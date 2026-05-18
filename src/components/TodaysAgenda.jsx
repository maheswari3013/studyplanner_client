import { useState, useEffect } from 'react';
import API from '../api/axios'; 
import StudyTimer from './StudyTimer';
import FocusMode from '../pages/FocusMode';
import { Maximize2 } from 'lucide-react';
import '../assets/TodaysAgenda.css';

export default function TodaysAgenda() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBlock, setEditingBlock] = useState(null);
  const [editForm, setEditForm] = useState({ subject: '', topic: '', duration: '', date: '' });
  const [showDateModal, setShowDateModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeTimerBlock, setActiveTimerBlock] = useState(null);
  const [focusModeBlock, setFocusModeBlock] = useState(null);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const res = await API.get('/schedule/today');
      setBlocks(res.data);
    } catch (err) {
      console.error('Failed to fetch today:', err);
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  const markComplete = async (id) => {
    await API.patch(`/schedule/${id}/complete`);
    setActiveTimerBlock(null);
    setFocusModeBlock(null);
    fetchToday();
  };

  const markMissed = async (id) => {
    await API.patch(`/schedule/${id}/missed`);
    setActiveTimerBlock(null);
    setFocusModeBlock(null);
    fetchToday();
  };

  const handleNeedMoreTime = async (id) => {
    await API.patch(`/schedule/${id}`, {
      $inc: { duration: 15 }
    });
    fetchToday();
  };

  const deleteBlock = async (id) => {
    if (!confirm('Delete this study block?')) return;
    await API.delete(`/schedule/${id}`);
    fetchToday();
  };

  const openEditModal = (block) => {
    setEditingBlock(block);
    setEditForm({
      subject: block.subject,
      topic: block.topic,
      duration: block.duration,
      date: block.date.split('T')[0]
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await API.patch(`/schedule/${editingBlock._id}`, editForm);
    setEditingBlock(null);
    fetchToday();
  };

  const generateSchedule = async () => {
    setGenerating(true);
    try {
      const body = startDate? { startDate } : {};
      const res = await API.post('/schedule/generate', body);
      alert(`Generated ${res.data.count} study blocks starting ${startDate || 'tomorrow'}`);
      setShowDateModal(false);
      setStartDate('');
      await fetchToday();
    } catch (err) {
      console.error('Generate failed:', err);
      alert(err.response?.data?.msg || 'Failed to generate schedule. Add exams first.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="agenda-container">
      {/* Focus Mode Overlay - renders on top */}
      {focusModeBlock && (
        <FocusMode
          block={focusModeBlock}
          onClose={() => setFocusModeBlock(null)}
          onComplete={markComplete}
          onNeedMoreTime={handleNeedMoreTime}
        />
      )}

      <div className="agenda-header">
        <h2>Today's Agenda</h2>
        <button onClick={() => setShowDateModal(true)} disabled={generating} className="btn-generate-schedule">
          {generating? 'Generating...' : '🔄 Generate New Schedule'}
        </button>
      </div>

      {/* Active Timer - shows below header */}
      {activeTimerBlock &&!focusModeBlock && (
        <StudyTimer
          block={activeTimerBlock}
          onComplete={markComplete}
          onNeedMoreTime={handleNeedMoreTime}
          onClose={() => setActiveTimerBlock(null)}
        />
      )}

      {showDateModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>When should we start?</h3>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <div className="modal-actions">
              <button onClick={generateSchedule} disabled={generating}>
                {generating? 'Generating...' : startDate? 'Start from this date' : 'Start tomorrow'}
              </button>
              <button type="button" onClick={() => { setShowDateModal(false); setStartDate(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading? (
        <p className="loading-text">Loading...</p>
      ) : blocks.length === 0 && (
        <p className="empty-state">No study blocks for today. Click generate!</p>
      )}

      {blocks.map(block => {
        let cardClass = 'block-card';
        if (block.completed) cardClass += ' completed';
        if (block.missed) cardClass += ' missed';

        return (
          <div key={block._id} className={cardClass}>
            <div className="block-card-header">
              <div className="block-card-content">
                <h3>{block.subject} - {block.topic}</h3>
                <p className="block-meta">
                  <span><b>Type:</b> {block.type}</span>
                  <span><b>Duration:</b> {block.duration} min</span>
                  <span><b>Time:</b> {block.startTime}</span>
                </p>
              </div>
              <div className="block-card-controls">
                <button className="edit-btn" onClick={() => openEditModal(block)}>✎</button>
                <button className="delete-btn" onClick={() => deleteBlock(block._id)}>✕</button>
              </div>
            </div>

            {!block.completed &&!block.missed && (
              <div className="block-actions">
                <button onClick={() => setActiveTimerBlock(block)} className="btn-start">
                  ▶ Start Timer
                </button>
                <button onClick={() => setFocusModeBlock(block)} className="btn-focus">
                  <Maximize2 size={16} /> Focus
                </button>
                <button onClick={() => markComplete(block._id)} className="btn-complete">
                  ✓ Complete
                </button>
                <button onClick={() => markMissed(block._id)} className="btn-missed">
                  ✗ Missed
                </button>
              </div>
            )}

            {block.completed && <span className="status-badge completed">✓ Completed</span>}
            {block.missed && <span className="status-badge missed">✗ Missed</span>}
          </div>
        );
      })}

      {editingBlock && (
        <div className="modal-backdrop" onClick={() => setEditingBlock(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Study Block</h3>
            <form onSubmit={handleEditSubmit}>
              <input
                placeholder="Subject"
                value={editForm.subject}
                onChange={e => setEditForm({...editForm, subject: e.target.value})}
                required
              />
              <input
                placeholder="Topic"
                value={editForm.topic}
                onChange={e => setEditForm({...editForm, topic: e.target.value})}
                required
              />
              <input
                type="number"
                placeholder="Duration (min)"
                value={editForm.duration}
                onChange={e => setEditForm({...editForm, duration: e.target.value})}
                required
              />
              <input
                type="date"
                value={editForm.date}
                onChange={e => setEditForm({...editForm, date: e.target.value})}
                required
              />
              <div className="modal-actions">
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditingBlock(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}