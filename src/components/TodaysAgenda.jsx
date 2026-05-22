import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import StudyTimer from '../components/StudyTimer';
import { Maximize2, ClockIcon, Play } from 'lucide-react';
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

  const [dayStartsAt, setDayStartsAt] = useState(9);
  const [dayEndsAt, setDayEndsAt] = useState(18);

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

  const isOverdue = (block) => {
    if (block.completed || block.missed || block.isBreak) return false;
    const now = new Date();
    const blockStart = new Date(`${block.date}T${block.time}:00+05:30`);
    const blockEnd = new Date(blockStart);
    blockEnd.setMinutes(blockEnd.getMinutes() + block.duration);
    return now > blockEnd;
  };

  const markComplete = async (id) => {
    try {
      setBlocks(prev => prev.map(b => b._id === id? {...b, completed: true, missed: false } : b));
      await API.patch(`/schedule/${id}/complete`);
      setActiveTimerBlock(null);
      toast.success('Marked as complete!');
    } catch (err) {
      toast.error('Failed to complete');
      fetchToday();
    }
  };

  // UPDATED: Keep missed blocks visible in red + reschedule
  const markMissed = async (id) => {
    try {
      // Optimistic update - turn red immediately
      setBlocks(prev => prev.map(b => b._id === id? {...b, missed: true, completed: false } : b));
      setActiveTimerBlock(null);

      const res = await API.patch(`/schedule/${id}/missed`);
      console.log('Missed response:', res.data);

      toast.success(`Marked as missed. Rescheduled ${res.data.newBlocksCreated} new blocks`);

      await fetchToday();

    } catch (err) {
      console.error('Missed error:', err.response?.data);
      toast.error(err.response?.data?.msg || 'Failed to mark missed');
      await fetchToday();
    }
  };

  const markPending = async (id) => {
    try {
      setBlocks(prev => prev.map(b => b._id === id? {...b, completed: false, missed: false } : b));
      await API.patch(`/schedule/${id}/pending`);
      toast.success('Reset to pending');
    } catch (err) {
      toast.error('Failed to reset');
      fetchToday();
    }
  };

  const handleStartNow = async (id) => {
    try {
      const res = await API.post(`/schedule/${id}/start`);
      toast.success(res.data.msg);
      await fetchToday();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to start');
    }
  };

  const handleNeedMoreTime = async (id, currentDuration) => {
    try {
      await API.patch(`/schedule/${id}`, { duration: currentDuration + 15 });
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
      date: block.date,
      time: block.time
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
    if (!confirm('This will delete your current schedule and regenerate. Continue?')) return;
    setGenerating(true);
    try {
      const examsRes = await API.get('/exams');
      const exams = examsRes.data;
      if (!exams.length) {
        toast.error('No exams found. Create an exam first.');
        setGenerating(false);
        return;
      }

      await API.delete('/schedule/clear-all');

      const res = await API.post('/schedule/generate', {
        exams,
        startHour: parseInt(dayStartsAt) || 9,
        endHour: parseInt(dayEndsAt) || 18,
        startDate: startDate || new Date().toISOString().split('T')[0],
        breakRatio: { study: 50, break: 10 }
      });

      toast.success(`Generated ${res.data.count} blocks`);
      setShowDateModal(false);
      setStartDate('');
      await fetchToday();
      if (res.data.warnings?.length) toast(res.data.warnings.join(', '), { icon: '⚠️' });
    } catch (err) {
      console.error('Generate failed:', err);
      toast.error(err.response?.data?.msg || 'Failed to generate');
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
            <h3>Generate New Schedule</h3>
            <p className="modal-subtitle">This will delete all existing blocks.</p>

            <label>Start from:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />

            <label>Day starts at (0-23):</label>
            <input
              type="number"
              min="0"
              max="23"
              value={dayStartsAt}
              onChange={(e) => setDayStartsAt(e.target.value)}
            />

            <label>Day ends at (1-23):</label>
            <input
              type="number"
              min="1"
              max="23"
              value={dayEndsAt}
              onChange={(e) => setDayEndsAt(e.target.value)}
            />
            <small>For full day use 0 to 23. For overnight use like 22 to 6.</small>

            <div className="modal-actions">
              <button onClick={generateSchedule} disabled={generating}>
                {generating? 'Generating...' : startDate? 'Start from this date' : 'Start today'}
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
      ) : blocks.length === 0? (
        <p className="empty-state">No study blocks for today. Click generate!</p>
      ) : (
        blocks.map(block => {
          const isBreak = block.isBreak || block.type === 'Break';
          const isCompleted = block.completed;
          const isMissed = block.missed;
          const isPending =!isCompleted &&!isMissed;
          const isStudyOrReview = block.type === 'Study' || block.type === 'Review';
          const overdue = isOverdue(block);

          return (
            <div key={block._id} className={`block-card ${isBreak? 'break' : ''} ${isCompleted? 'completed' : ''} ${isMissed? 'missed' : ''} ${overdue &&!isMissed? 'overdue' : ''}`}>
              <div className="block-card-header">
                <div className="block-card-content">
                  <h3>{block.subject} - {block.topic}</h3>
                  <p className="block-meta">
                    <span><b>Type:</b> {block.type}</span>
                    <span><b>Duration:</b> {block.duration} min</span>
                    <span><b>Time:</b> {block.time}</span>
                  </p>
                  {block.topic?.includes('Makeup') && <span className="makeup-badge">Makeup Session</span>}
                  {overdue &&!isMissed && <span className="overdue-badge">⚠️ Overdue</span>}
                  {isMissed && <span className="missed-badge">✗ Missed - Rescheduled</span>}
                </div>
                <div className="block-card-controls">
                  <button className="edit-btn" onClick={() => openEditModal(block)}>✎</button>
                  <button className="delete-btn" onClick={() => deleteBlock(block._id)}>✕</button>
                </div>
              </div>

              <div className="block-actions">
                {isPending && isStudyOrReview && (
                  <>
                    <button onClick={() => setActiveTimerBlock(block)} className="btn-start">
                      ▶ Start Timer
                    </button>
                    <button onClick={() => navigate('/focus', { state: { block } })} className="btn-focus">
                      <Maximize2 size={16} /> Focus
                    </button>
                    <button onClick={() => markComplete(block._id)} className="btn-complete">
                      ✓ Complete
                    </button>
                    <button onClick={() => markMissed(block._id)} className="btn-missed">
                      X Missed
                    </button>
                  </>
                )}

                {isCompleted && (
                  <>
                    <span className="status-badge completed">✓ Completed</span>
                    <button onClick={() => markPending(block._id)} className="btn-pending">
                      <ClockIcon size={16} /> Set Pending
                    </button>
                  </>
                )}

                {isMissed && (
                  <>
                    <span className="status-badge missed">✗ Missed</span>
                    <button onClick={() => markPending(block._id)} className="btn-pending">
                      <ClockIcon size={16} /> Undo Missed
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {editingBlock && (
        <div className="modal-backdrop" onClick={() => setEditingBlock(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Study Block</h3>
            <form onSubmit={handleEditSubmit}>
              <input placeholder="Subject" value={editForm.subject} onChange={e => setEditForm({...editForm, subject: e.target.value })} required />
              <input placeholder="Topic" value={editForm.topic} onChange={e => setEditForm({...editForm, topic: e.target.value })} required />
              <input type="number" placeholder="Duration (min)" value={editForm.duration} onChange={e => setEditForm({...editForm, duration: e.target.value })} required />
              <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value })} required />
              <input type="time" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value })} required />
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