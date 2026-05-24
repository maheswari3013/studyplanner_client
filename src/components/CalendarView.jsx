import { useState, useEffect } from 'react';
import API from '../api/axios';
import { scheduleApi } from '../api/scheduleApi';
import { ChevronLeft, ChevronRight, Download, FileText, X, AlertTriangle, Link, Clock, Calendar as CalendarIcon, BookOpen, Zap, Coffee, FileWarning } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/CalendarView.css';

const getGoogleAuthOrigin = () => {
  const url = import.meta.env.VITE_API_URL || 'https://studyplanner-api-awmh.onrender.com/api';
  try {
    return new URL(url).origin;
  } catch {
    return 'https://studyplanner-api-awmh.onrender.com';
  }
};

const GOOGLE_AUTH_ORIGIN = getGoogleAuthOrigin();

export default function CalendarView() {
  const [blocks, setBlocks] = useState([]);
  const [exams, setExams] = useState([]);
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfStart, setPdfStart] = useState('');
  const [pdfEnd, setPdfEnd] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState({});
  const [loggingBlock, setLoggingBlock] = useState(null);
  const [actualMinutes, setActualMinutes] = useState('');

  async function fetchData() {
    setScheduleLoading(true);
    try {
      const [blocksRes, examsRes] = await Promise.all([
        scheduleApi.getSchedule(),
        API.get('/exams')
      ]);
      setBlocks(blocksRes.data);
      setExams(examsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load schedule');
    } finally {
      setScheduleLoading(false);
    }
  }

  async function checkGoogleConnection() {
    try {
      const res = await API.get('/schedule/google/status');
      setGoogleConnected(res.data.connected);
    } catch {
      setGoogleConnected(false);
    }
  }

  const getBlockData = (block) => {
    if (block.isExam) return { class: 'block-exam', icon: FileWarning, label: 'EXAM' };
    if (block.missed) return { class: 'block-missed', icon: AlertTriangle, label: 'Missed' };
    if (block.completed) return { class: 'block-done', icon: Zap, label: 'Done' };
    if (block.isBreak) return { class: 'block-break', icon: Coffee, label: 'Break' };
    if (block.type === 'Review') return { class: 'block-review', icon: BookOpen, label: 'Review' };
    return { class: 'block-study', icon: CalendarIcon, label: 'Study' };
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchData();
      checkGoogleConnection();
    });

    const handleMessage = async (event) => {
      if (event.origin !== GOOGLE_AUTH_ORIGIN) return;

      const message = event.data;
      const success =
        message?.type === 'google-calendar-success' ||
        message?.type === 'google-auth-success' ||
        message?.type === 'GOOGLE_AUTH_SUCCESS';
      const error =
        message?.type === 'google-auth-error' ||
        message?.type === 'GOOGLE_AUTH_ERROR';

      if (success) {
        toast.success('Google connected!');
        setGoogleConnected(true);
        await fetchData();
        setSyncing(false);
      }

      if (error) {
        const errMsg =
          typeof message === 'object' ? message.error : 'Google auth failed';
        toast.error('Google connect failed: ' + errMsg);
        setSyncing(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleMarkMissed = async (blockId) => {
    setScheduleLoading(true);
    setIsCompleting(prev => ({ ...prev, [blockId]: true }));
    try {
      const latestBlock = blocks.find(b => b._id === blockId);
      if (!latestBlock) {
        toast('This session was updated. Refreshing...');
        await fetchData();
        setSelectedDay(null);
        return;
      }

      const res = await scheduleApi.markMissed(latestBlock._id);
      if (res?.notFound) {
        toast('This session was updated. Refreshing...');
        await fetchData();
        setSelectedDay(null);
        return;
      }

      if (res.data?.success) {
        toast.success(`Rescheduled! Created ${res.data.newBlocksCreated} new blocks`);
        await fetchData();
        setSelectedDay(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to reschedule');
    } finally {
      setScheduleLoading(false);
      setIsCompleting(prev => ({ ...prev, [blockId]: false }));
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm('Delete this missed study block?')) return;
    setScheduleLoading(true);
    try {
      await API.delete(`/schedule/${blockId}`);
      toast.success('Missed block deleted');
      await fetchData();
      setSelectedDay(null);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to delete block');
    } finally {
      setScheduleLoading(false);
    }
  };

  const logTime = async () => {
    if (!loggingBlock || !actualMinutes) return toast.error('Enter minutes');
    try {
      await API.post('/schedule/log', {
        blockId: loggingBlock._id,
        actualMinutes: parseInt(actualMinutes)
      });
      toast.success('Time logged');
      setLoggingBlock(null);
      setActualMinutes('');
      fetchData();
      setSelectedDay(null);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to log time');
    }
  };

  const nukeAll = async () => {
    if (!window.confirm(`Delete ALL ${blocks.length} blocks from DB?`)) return;
    try {
      const res = await API.delete('/schedule/clear-all');
      toast.success(res.data.msg);
      setBlocks([]);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error('Failed: ' + err.response?.data?.msg);
    }
  };

  const downloadWeeklyPDF = async () => {
    try {
      toast.loading('Generating PDF...');
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + 7);

      const res = await API.get('/schedule/export/pdf', {
        params: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-schedule-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('PDF downloaded');
    } catch (err) {
      toast.dismiss();
      console.error('PDF error:', err);
      toast.error(err.response?.data?.msg || 'Failed to download PDF');
    }
  };

  const exportPDF = async () => {
    if (!pdfStart || !pdfEnd) return toast.error('Select start and end dates');
    setExporting(true);
    try {
      const res = await API.get('/schedule/export/pdf', {
        params: { start: pdfStart, end: pdfEnd },
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-schedule-${pdfStart}-to-${pdfEnd}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      setShowPdfModal(false);
      toast.success('PDF exported');
    } catch {
      toast.error('PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  const exportICS = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StudySync//Study Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    const activeBlocks = blocks.filter(b => !b.missed && !b.completed);

    if (activeBlocks.length === 0) {
      toast.error('No active study blocks to export');
      return;
    }

    activeBlocks.forEach(block => {
      const start = new Date(`${block.date}T${block.time}:00`);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + block.duration);

      const formatLocal = (date) => {
        const pad = n => String(n).padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
      };

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${block._id}@studysync.app`,
        `DTSTAMP:${formatLocal(new Date())}`,
        `DTSTART:${formatLocal(start)}`,
        `DTEND:${formatLocal(end)}`,
        `SUMMARY:${block.subject} - ${block.topic}`,
        `DESCRIPTION:Study session for ${block.subject}\\nType: ${block.type}\\nDuration: ${block.duration} min\\nPriority: ${block.priority || 'N/A'}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'study-schedule.ics';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported! Open with your calendar app');
  };

  const syncGoogle = async () => {
    setSyncing(true);

    try {
      const res = await API.get('/schedule/google/sync');
      if (res.data.success) {
        toast.success(`Synced ${res.data.synced} blocks to Google Calendar`);
        setGoogleConnected(true);
      }
    } catch (err) {
      if (err.response?.data?.action === 'CONNECT_CALENDAR' || err.response?.data?.needsAuth) {
        toast('Connect Google Calendar first');
        const clientOrigin = window.location.origin;
        const token = localStorage.getItem('token');
        const popup = window.open(
          `${GOOGLE_AUTH_ORIGIN}/api/auth/google/calendar?origin=${encodeURIComponent(clientOrigin)}&token=${token}`,
          'gcal-connect',
          'width=500,height=600'
        );

        const handler = (event) => {
          if (event.origin !== GOOGLE_AUTH_ORIGIN) return;
          if (event.data?.type === 'google-calendar-success') {
            window.removeEventListener('message', handler);
            popup?.close();
            toast.success('Calendar connected. Retrying sync...');
            setGoogleConnected(true);
            syncGoogle();
          }
        };
        window.addEventListener('message', handler);
      } else {
        toast.error(err.response?.data?.message || err.response?.data?.msg || 'Sync failed');
      }
    } finally {
      setSyncing(false);
    }
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getBlocksForDay = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayBlocks = blocks.filter(b => {
      const blockDate = (b.date || b.start)?.split('T')[0];
      return blockDate === dateStr;
    });

    const dayExams = exams
    .filter(e => {
        const examDate = typeof e.examDate === 'string'
        ? e.examDate.split('T')[0]
          : new Date(e.examDate).toISOString().split('T')[0];
        return examDate === dateStr;
      })
    .map(e => ({
        _id: e._id,
        subject: e.subject,
        topic: e.syllabus || 'EXAM',
        startTime: e.time || '09:00',
        duration: 0,
        type: 'Exam',
        date: e.examDate,
        isExam: true,
        location: e.location,
        color: e.color || '#dc2626'
      }));

    return [...dayBlocks, ...dayExams].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
  };

  const changeDate = (delta) => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + delta);
    } else {
      newDate.setDate(newDate.getDate() + (delta * 7));
    }
    setCurrentDate(newDate);
  };

  const days = view === 'month' ? getMonthDays() : getWeekDays();
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="calendar-container-pro">
      <Toaster position="top-right" />
      <div className="calendar-header-pro">
        <div className="header-left">
          <h2 className="calendar-title-pro">
            <CalendarIcon size={28} />
            Study Calendar
          </h2>
        </div>
        <div className="calendar-controls-pro">
          <button onClick={downloadWeeklyPDF} className="btn-cal btn-cal-purple">
            <FileText size={18} /> Weekly PDF
          </button>
          <button onClick={exportICS} className="btn-cal btn-cal-green">
            <Download size={18} /> Export.ics
          </button>
          <button onClick={syncGoogle} className="btn-cal btn-cal-blue" disabled={syncing}>
            <Link size={18} /> {syncing ? 'Syncing...' : googleConnected ? 'Synced with Google' : 'Connect'}
          </button>
          <button onClick={() => setShowPdfModal(true)} className="btn-cal btn-cal-red">
            <FileText size={18} /> Custom PDF
          </button>
          <button onClick={nukeAll} className="btn-cal" style={{background: '#dc2626'}}>
            NUKE ALL BLOCKS
          </button>
          <div className="view-toggle-pro">
            <button
              onClick={() => setView('month')}
              className={`view-btn-pro ${view === 'month' ? 'active' : ''}`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`view-btn-pro ${view === 'week' ? 'active' : ''}`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {selectedDay && (
        <div className="modal-overlay-pro" onClick={() => setSelectedDay(null)}>
          <div className="modal-content-pro" onClick={e => e.stopPropagation()}>
            <div className="modal-header-pro">
              <h3 className="modal-title-pro">
                {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="close-btn-pro">
                <X size={20} />
              </button>
            </div>
            {selectedDay.blocks.length === 0 ? (
              <p className="empty-day">No study blocks or exams scheduled</p>
            ) : (
              selectedDay.blocks.map(block => {
                const blockColor = block.color || '#3B82F6';
                const blockTypeClass = block.isBreak || block.type === 'Break' ? 'break-block' : 'study-block';
                const blockEmoji = block.isExam ? '📝' : block.isBreak || block.type === 'Break' ? '☕' : '📚';
                return (
                  <div key={block._id} className={`block-detail-pro ${getBlockData(block).class} ${blockTypeClass}`} style={{ borderLeft: `4px solid ${blockColor}` }}>
                    <div className="block-detail-header-pro">
                      <div className="block-icon" style={{ color: blockColor }}>
                        {blockEmoji}
                      </div>
                      <div className="block-detail-content">
                        <div className="block-title-pro">
                          {block.time} - {block.subject} {block.isExam && '(EXAM)'}
                        </div>
                        <div className="block-meta-pro">
                          {block.topic}
                        </div>
                        <div className="block-status-pro">
                          {block.isExam ? (
                            `Location: ${block.location || 'TBA'}`
                          ) : (
                            `Planned: ${block.duration} min | ${block.type} ${block.actualDuration > 0 ? `| Actual: ${block.actualDuration} min` : ''}`
                          )}
                        </div>
                      </div>
                      <div className="block-actions-pro">
                        {!block.completed && !block.missed && !block.isBreak && !block.isExam && (
                          <button
                            onClick={() => handleMarkMissed(block._id)}
                            className="missed-btn-pro"
                            title="Mark as missed - will reschedule"
                            disabled={scheduleLoading || syncing || isCompleting[block._id]}
                          >
                            <AlertTriangle size={14} /> {isCompleting[block._id] ? 'Processing...' : 'Missed'}
                          </button>
                        )}
                        {block.completed && !block.isBreak && !block.isExam && (
                          <button
                            onClick={() => setLoggingBlock(block)}
                            className="log-btn-pro"
                            title="Log actual time spent"
                            disabled={scheduleLoading || syncing}
                          >
                            <Clock size={14} /> {block.actualDuration ? 'Update' : 'Log'}
                          </button>
                        )}
                        {block.missed && (
                          <button
                            onClick={() => handleDeleteBlock(block._id)}
                            className="delete-btn-pro"
                            title="Delete missed block"
                            disabled={scheduleLoading || syncing}
                          >
                            <X size={14} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {selectedDay.blocks.length > 0 && (selectedDay.blocks[selectedDay.blocks.length - 1]?.isBreak || selectedDay.blocks[selectedDay.blocks.length - 1]?.type === 'Break') && (
              <div className="day-end-warning">Day ends with break</div>
            )}
          </div>
        </div>
      )}

      {loggingBlock && (
        <div className="modal-overlay-pro">
          <div className="modal-content-pro">
            <h3 className="modal-title-pro">Log Actual Study Time</h3>
            <p className="modal-sub">{loggingBlock.subject} - {loggingBlock.topic}</p>
            <p className="modal-info">Planned: {loggingBlock.duration} minutes</p>
            <input
              type="number"
              placeholder="Actual minutes spent"
              value={actualMinutes}
              onChange={(e) => setActualMinutes(e.target.value)}
              className="form-input-pro"
              autoFocus
            />
            <div className="modal-actions-pro">
              <button onClick={logTime} className="btn-primary-pro">Save</button>
              <button onClick={() => { setLoggingBlock(null); setActualMinutes(''); }} className="btn-secondary-pro">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfModal && (
        <div className="modal-overlay-pro">
          <div className="modal-content-pro">
            <h3 className="modal-title-pro">Export PDF - Select Date Range</h3>
            <div className="form-group-pro">
              <label className="form-label-pro">Start Date</label>
              <input
                type="date"
                value={pdfStart}
                onChange={(e) => setPdfStart(e.target.value)}
                className="form-input-pro"
              />
            </div>
            <div className="form-group-pro">
              <label className="form-label-pro">End Date</label>
              <input
                type="date"
                value={pdfEnd}
                onChange={(e) => setPdfEnd(e.target.value)}
                min={pdfStart}
                className="form-input-pro"
              />
            </div>
            <div className="modal-actions-pro">
              <button
                onClick={exportPDF}
                disabled={exporting || !pdfStart || !pdfEnd}
                className="btn-primary-pro"
              >
                {exporting ? 'Generating...' : 'Export PDF'}
              </button>
              <button
                onClick={() => { setShowPdfModal(false); setPdfStart(''); setPdfEnd(''); }}
                className="btn-secondary-pro"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="calendar-grid-pro">
        <div className="month-nav-pro">
          <button onClick={() => changeDate(-1)} className="nav-btn-pro">
            <ChevronLeft size={20} />
          </button>
          <h3 className="month-year-pro">{monthYear}</h3>
          <button onClick={() => changeDate(1)} className="nav-btn-pro">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="days-grid-pro">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-header-pro">
              {day}
            </div>
          ))}

          {days.map((day, idx) => {
            const dayBlocks = getBlocksForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const maxVisible = view === 'week' ? 5 : 2;

            return (
              <div
                key={idx}
                className={`day-cell-pro ${view === 'week' ? 'week-view' : ''} ${isToday ? 'today' : ''} ${view === 'month' && !isCurrentMonth ? 'other-month' : ''}`}
                onClick={() => setSelectedDay({ date: day, blocks: dayBlocks })}
              >
                <div className={`day-number-pro ${isToday ? 'today' : ''}`}>
                  {day.getDate()}
                </div>
                {dayBlocks.slice(0, maxVisible).map(block => {
                  const blockColor = block.color || '#3B82F6';
                  const blockEmoji = block.isExam ? '📝' : block.isBreak || block.type === 'Break' ? '☕' : '📚';
                  return (
                    <div
                      key={block._id}
                      className={`block-pro ${getBlockData(block).class} ${block.isBreak || block.type === 'Break' ? 'break-block' : 'study-block'}`}
                      style={{ backgroundColor: blockColor }}
                      title={`${block.time} - ${block.subject}: ${block.topic}`}
                    >
                      <span>{blockEmoji}</span>
                      <span>{block.isExam ? `${block.subject}` : `${block.time} ${block.subject}`}</span>
                      {block.actualDuration > 0 && <span className="actual-badge-pro">{block.actualDuration}m</span>}
                    </div>
                  );
                })}
                {dayBlocks.length > maxVisible && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedDay({ date: day, blocks: dayBlocks }); }}
                    className="more-btn-pro"
                  >
                    +{dayBlocks.length - maxVisible} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
