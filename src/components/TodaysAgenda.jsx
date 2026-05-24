import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { scheduleApi } from '../api/scheduleApi';
import StudyTimer from '../components/StudyTimer';
import AgendaBlock from '../components/AgendaBlock';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import StyledButton from '../components/StyledButton';
import toast from 'react-hot-toast';
import '../assets/TodaysAgenda.css';
const filterDayBlocks = (blocks) => {
  const result = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isBreak = block.isBreak || block.type === 'Break';
    
    if (!isBreak) {
      result.push(block);
    } else {
      let prevStudy = null;
      for (let j = i - 1; j >= 0; j--) {
        if (!(blocks[j].isBreak || blocks[j].type === 'Break')) {
          prevStudy = blocks[j];
          break;
        }
      }
      
      let nextStudy = null;
      for (let j = i + 1; j < blocks.length; j++) {
        if (!(blocks[j].isBreak || blocks[j].type === 'Break')) {
          nextStudy = blocks[j];
          break;
        }
      }
      
      const isPrevValid = prevStudy && !(prevStudy.missed || prevStudy.status === 'missed');
      const isNextValid = nextStudy && !(nextStudy.missed || nextStudy.status === 'missed');
      const lastInResultIsBreak = result.length > 0 && (result[result.length - 1].isBreak || result[result.length - 1].type === 'Break');
      
      if (isPrevValid && isNextValid && !lastInResultIsBreak) {
        result.push(block);
      }
    }
  }
  return result;
};

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
  const [isCompleting, setIsCompleting] = useState({});

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
    Promise.resolve().then(fetchToday);
  }, []);

  // Keep the active timer block updated when the blocks list is re-fetched/updated
  useEffect(() => {
    if (activeTimerBlock) {
      const updated = blocks.find(b => b._id === activeTimerBlock._id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(activeTimerBlock)) {
        setActiveTimerBlock(updated);
      }
    }
  }, [blocks, activeTimerBlock]);

  const isOverdue = (block) => {
    if (block.completed || block.missed || block.isBreak) return false;
    const now = new Date();
    const blockStart = new Date(`${block.date}T${block.time}:00+05:30`);
    const blockEnd = new Date(blockStart);
    blockEnd.setMinutes(blockEnd.getMinutes() + block.duration);
    return now > blockEnd;
  };

  const markComplete = async (id) => {
    setIsCompleting(prev => ({...prev, [id]: true }));
    try {
      setBlocks(prev => prev.map(b => b._id === id? {...b, completed: true, missed: false } : b));
      const res = await scheduleApi.completeBlock(id);
      if (res?.notFound) {
        toast('This session was updated. Refreshing...');
      } else {
        setActiveTimerBlock(null);
        toast.success('Marked as complete!');
      }
    } catch {
      toast.error('Failed to complete');
    } finally {
      await fetchToday();
      setIsCompleting(prev => ({...prev, [id]: false }));
    }
  };

  const markMissed = async (id) => {
    setIsCompleting(prev => ({...prev, [id]: true }));
    try {
      setBlocks(prev => prev.map(b => b._id === id? {...b, missed: true, completed: false } : b));
      setActiveTimerBlock(null);

      const res = await scheduleApi.markMissed(id);
      if (res?.notFound) {
        toast('This session was updated. Refreshing...');
      } else {
        toast.success(`Marked as missed. Rescheduled ${res.data.newBlocksCreated} new blocks`);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        toast('This session was updated. Refreshing...');
      } else {
        toast.error(err.response?.data?.msg || 'Failed to mark missed');
      }
    } finally {
      await fetchToday();
      setIsCompleting(prev => ({...prev, [id]: false }));
    }
  };

  const markPending = async (id) => {
    try {
      setBlocks(prev => prev.map(b => b._id === id? {...b, completed: false, missed: false } : b));
      await API.patch(`/schedule/${id}/pending`);
      toast.success('Reset to pending');
    } catch {
      toast.error('Failed to reset');
      fetchToday();
    }
  };

  const handleNeedMoreTime = async (id, currentDuration) => {
    try {
      await API.patch(`/schedule/${id}`, { duration: currentDuration + 15 });
      toast.success('+15 minutes added');
      fetchToday();
    } catch {
      toast.error('Failed to add time');
    }
  };

  const deleteBlock = async (id) => {
    if (!confirm('Delete this study block?')) return;
    try {
      await API.delete(`/schedule/${id}`);
      toast.success('Block deleted');
      fetchToday();
    } catch {
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
    } catch {
      toast.error('Failed to update');
    }
  };

  const generateSchedule = async () => {
    if (!confirm('This will delete your current schedule and regenerate. Continue?')) return;
    setGenerating(true);
    setLoading(true);
    try {
      const examsRes = await API.get('/exams');
      const exams = examsRes.data;
      if (!exams.length) {
        toast.error('No exams found. Create an exam first.');
        setGenerating(false);
        setLoading(false);
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
      setActiveTimerBlock(null);
      await fetchToday();
      toast.success('Schedule updated');
      if (res.data.warnings?.length) toast(res.data.warnings.join(', '), { icon: '!' });
    } catch (err) {
      console.error('Generate failed:', err);
      toast.error(err.response?.data?.msg || 'Failed to generate');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const sortedBlocks = [...blocks].sort((a, b) => {
    const timeA = (a.startTime || a.time || '').toString();
    const timeB = (b.startTime || b.time || '').toString();
    return timeA.localeCompare(timeB);
  });

  if (import.meta.env.DEV) {
    sortedBlocks.forEach((block, idx) => {
      const next = sortedBlocks[idx + 1];
      if (next && (block.startTime || block.time) === (next.startTime || next.time)) {
        console.warn('Overlap detected in agenda:', block, next);
      }
    });
  }

  const groupedBlocks = sortedBlocks.reduce((groups, block) => {
    const dateKey = block.date? block.date.split('T')[0] : 'unknown';
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(block);
    return groups;
  }, {});

  return (
    <DashboardLayout>
      <div className="agenda-container">
        <div className="agenda-header">
          <h2 className="agenda-title">Today's Agenda</h2>
          <StyledButton onClick={() => setShowDateModal(true)} disabled={generating} variant="primary">
            {generating? 'Generating...' : 'Generate New Schedule'}
          </StyledButton>
        </div>

        {showDateModal && (
          <div className="modal-backdrop">
            <GlassCard className="modal">
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
                <StyledButton onClick={generateSchedule} disabled={generating} variant="primary">
                  {generating? 'Generating...' : startDate? 'Start from this date' : 'Start today'}
                </StyledButton>
                <StyledButton type="button" onClick={() => { setShowDateModal(false); setStartDate(''); }} variant="secondary">
                  Cancel
                </StyledButton>
              </div>
            </GlassCard>
          </div>
        )}

        {loading? (
          <p className="loading-text">Loading...</p>
        ) : sortedBlocks.length === 0? (
          <p className="empty-state">No study blocks for today. Click generate!</p>
        ) : (
          Object.keys(groupedBlocks).sort().map((date) => {
            const dayBlocks = groupedBlocks[date];
            const filteredBlocks = filterDayBlocks(dayBlocks);
            const lastBlock = filteredBlocks[filteredBlocks.length - 1];
            const dayEndsWithBreak = lastBlock && (lastBlock.isBreak || lastBlock.type === 'Break');
            return (
              <div key={date} className="agenda-day-group">
                <div className="agenda-day-header">
                  <h3>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                </div>
                {filteredBlocks.map(block => (
                  <AgendaBlock
                    key={block._id}
                    block={block}
                    overdue={isOverdue(block)}
                    isCompleting={!!isCompleting[block._id]}
                    onEdit={openEditModal}
                    onDelete={deleteBlock}
                    onStartTimer={setActiveTimerBlock}
                    onFocus={(focusBlock) => navigate('/focus', { state: { block: focusBlock } })}
                    onComplete={markComplete}
                    onMissed={markMissed}
                    onPending={markPending}
                    isTimerActive={activeTimerBlock?._id === block._id}
                    onNeedMoreTime={handleNeedMoreTime}
                    onCloseTimer={() => setActiveTimerBlock(null)}
                  />
                ))}
                {dayEndsWithBreak && (
                  <div className="day-end-warning">Day ends with break</div>
                )}
              </div>
            );
          })
        )}

        {editingBlock && (
          <div className="modal-backdrop" onClick={() => setEditingBlock(null)}>
            <GlassCard className="modal" onClick={e => e.stopPropagation()}>
              <h3>Edit Study Block</h3>
              <form onSubmit={handleEditSubmit}>
                <input placeholder="Subject" value={editForm.subject} onChange={e => setEditForm({...editForm, subject: e.target.value })} required />
                <input placeholder="Topic" value={editForm.topic} onChange={e => setEditForm({...editForm, topic: e.target.value })} required />
                <input type="number" placeholder="Duration (min)" value={editForm.duration} onChange={e => setEditForm({...editForm, duration: e.target.value })} required />
                <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value })} required />
                <input type="time" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value })} required />
                <div className="modal-actions">
                  <StyledButton type="submit" variant="primary">Save</StyledButton>
                  <StyledButton type="button" onClick={() => setEditingBlock(null)} variant="secondary">Cancel</StyledButton>
                </div>
              </form>
            </GlassCard>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}