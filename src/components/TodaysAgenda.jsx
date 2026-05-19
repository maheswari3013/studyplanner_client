import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import StudyTimer from '../components/StudyTimer';
import { Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import '../assets/TodaysAgenda.css';

export default function TodaysAgenda() {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBlock, setEditingBlock] = useState(null);
  const [editForm, setEditForm] = useState({ subject: '', topic: '', duration: '', date: '' });
  const [showDateModal, setShowDateModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeTimerBlock, setActiveTimerBlock] = useState(null);

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
    try {
      setBlocks(prev => prev.map(b => b._id === id? {...b, completed: true} : b));
      await API.patch(`/schedule/${id}/complete`);
      setActiveTimerBlock(null);
      toast.success('Marked as complete!');
    } catch (err) {
      toast.error('Failed to complete');
      fetchToday();
    }
  };

  const markMissed = async (id) => {
    try {
      setBlocks(prev => prev.map(b => b._id === id? {...b, missed: true} : b));
      await API.patch(`/schedule/${id}/missed`, {});
      setActiveTimerBlock(null);
      toast.success('Marked as missed. Schedule updated.');
    } catch (err) {
      toast.error('Failed to mark missed');
      fetchToday();
    }
  };

  const handleNeedMoreTime = async (id, currentDuration) => {
    try {
      await API.patch(`/schedule/${id}`, {
        duration: currentDuration + 15
      });
      toast.success('+15 minutes added');
      fetchToday();
    } catch (err) {
      toast.error('Failed to add time');
    }
  };

  const deleteBlock = async (id) => {
    if (!confirm('Delete this study block?')) return;
    try {
      await API.delete(`/schedule/${id}`);
      toast.success('Block deleted');
      fetchToday();
    } catch (err) {
      toast.error('Failed to delete');
    }
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
    try {
      await API.patch(`/schedule/${editingBlock._id}`, editForm);
      setEditingBlock(null);
      toast.success('Block updated');
      fetchToday();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  // FIXED: Now actually works - fetches exams + generates
  const generateSchedule = async () => {
    const confirm = window.confirm(
      'This will delete your current schedule and regenerate from your saved exams. Continue?'
    );
    if (!confirm) return;

    setGenerating(true);
    try {
      // 1. Get existing exams
      const examsRes = await API.get('/schedule/exams');
      const exams = examsRes.data;

      if (!exams.length) {
        toast.error('No exams found. Create an exam first in Onboarding.');
        setGenerating(false);
        setShowDateModal(false);
        return;
      }

      // 2. Clear old blocks
      await API.delete('/schedule/clear-all');

      // 3. Build config
      const config = {
        startDate: startDate? new Date(startDate) : new Date(),
        startHour: 9,
        endHour: 18,
        studyBlock: 50,
        breakBlock: 10
      };

      // 4. Generate new schedule
      const res = await API.post('/schedule/generate', { exams, config });

      toast.success(`Generated ${res.data.count} study blocks`);
      setShowDateModal(false);
      setStartDate('');
      await fetchToday();

      if (res.data.warnings?.length) {
        toast(res.data.warnings.join(', '), { icon: '⚠️' });
      }
    } catch (err) {
      console.error('Generate failed:', err);
      toast.error(err.response?.data?.msg || 'Failed to generate schedule');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="agenda-container">
      <div className="agenda-header">
        <h2>Today's Agenda</h2>
        <button onClick={() => setShowDateModal(true)} disabled={generating} className="btn-generate-schedule">
          {generating? 'Generating...' : '🔄 Generate New Schedule'}
        </button>
      </div>

      {activeTimerBlock && (
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
            <p className="modal-subtitle">This will delete all existing blocks and regenerate.</p>
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
                {!block.isBreak && (
                  <>
                    <button onClick={() => setActiveTimerBlock(block)} className="btn-start">
                      ▶ Start Timer
                    </button>
                    <button
                      onClick={() => navigate('/focus', { state: { block } })}
                      className="btn-focus"
                    >
                      <Maximize2 size={16} /> Focus
                    </button>
                  </>
                )}
                <button onClick={() => markComplete(block._id)} className="btn-complete">
                  ✓ Complete
                </button>
                {!block.isBreak && (
                  <button onClick={() => markMissed(block._id)} className="btn-missed">
                    X Missed
                  </button>
                )}
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