import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import StudyTimer from '../components/StudyTimer';
import { Maximize2, ClockIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import '../assets/TodaysAgenda.css';

export default function TodaysAgenda() {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBlock, setEditingBlock] = useState(null);
  const [editForm, setEditForm] = useState({ subject: '', topic: '', duration: '', date: '', time: '' });
  const [showDateModal, setShowDateModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeTimerBlock, setActiveTimerBlock] = useState(null);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const res = await API.get('/schedule/pending'); // FIX 1: Use /pending
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
      setBlocks(prev => prev.map(b => b._id === id? {...b, status: 'completed'} : b));
      await API.patch(`/schedule/blocks/${id}/complete`); // FIX 3: Add /blocks/
      setActiveTimerBlock(null);
      toast.success('Marked as complete!');
    } catch (err) {
      toast.error('Failed to complete');
      fetchToday();
    }
  };

  const markMissed = async (id) => {
    try {
      setBlocks(prev => prev.map(b => b._id === id? {...b, status: 'missed'} : b));
      const res = await API.patch(`/schedule/blocks/${id}/missed`); // FIX 3: Add /blocks/
      setActiveTimerBlock(null);
      toast.success(res.data.msg); // Backend sends "Makeup block scheduled at 15:30"
      setTimeout(fetchToday, 1000); // Refresh to show makeup block
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to mark missed');
      fetchToday();
    }
  };

  const markPending = async (id) => {
    try {
      setBlocks(prev => prev.map(b => b._id === id? {...b, status: 'pending'} : b));
      await API.patch(`/schedule/blocks/${id}/pending`); // FIX 3: Add /blocks/
      toast.success('Reset to pending');
    } catch (err) {
      toast.error('Failed to reset');
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
      date: block.date.split('T')[0],
      time: block.time || '' // Use time, not startTime
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

  const generateSchedule = async () => {
    const confirm = window.confirm(
      'This will delete your current schedule and regenerate from your saved exams. Continue?'
    );
    if (!confirm) return;

    setGenerating(true);
    try {
      const examsRes = await API.get('/exams');
      const exams = examsRes.data;

      if (!exams.length) {
        toast.error('No exams found. Create an exam first.');
        setGenerating(false);
        setShowDateModal(false);
        return;
      }

      await API.delete('/schedule/clear-all');

      const config = {
        startDate: startDate? new Date(startDate) : new Date(),
        startHour: 9,
        endHour: 18,
        studyBlock: 50,
        breakBlock: 10
      };

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
        if (block.status === 'completed') cardClass += ' completed';
        if (block.status === 'missed') cardClass += ' missed';

        return (
          <div key={block._id} className={cardClass}>
            <div className="block-card-header">
              <div className="block-card-content">
                <h3>{block.subject} - {block.topic}</h3>
                <p className="block-meta">
                  <span><b>Type:</b> {block.type}</span>
                  <span><b>Duration:</b> {block.duration} min</span>
                  <span><b>Time:</b> {block.time}</span> {/* FIX 2: Use block.time string */}
                </p>
                {block.rescheduledFrom && (
                  <span className="makeup-badge">Makeup Session</span>
                )}
              </div>
              <div className="block-card-controls">
                <button className="edit-btn" onClick={() => openEditModal(block)}>✎</button>
                <button className="delete-btn" onClick={() => deleteBlock(block._id)}>✕</button>
              </div>
            </div>

            <div className="block-actions">
              {block.status === 'pending' && (
                <>
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
                </>
              )}

              {block.status === 'completed' && (
                <>
                  <span className="status-badge completed">✓ Completed</span>
                  <button onClick={() => markPending(block._id)} className="btn-pending">
                    <ClockIcon size={16} /> Set Pending
                  </button>
                </>
              )}

              {block.status === 'missed' && (
                <>
                  <span className="status-badge missed">✗ Missed</span>
                  <button onClick={() => markPending(block._id)} className="btn-pending">
                    <ClockIcon size={16} /> Set Pending
                  </button>
                </>
              )}
            </div>
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
              <input
                type="time"
                value={editForm.time}
                onChange={e => setEditForm({...editForm, time: e.target.value})}
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