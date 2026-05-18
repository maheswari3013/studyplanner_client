import { useState, useEffect } from 'react';
import API from '../api/axios';
import { ChevronLeft, ChevronRight, Download, FileText, X, AlertTriangle, Link, Clock, Calendar as CalendarIcon, BookOpen, Zap, Coffee } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/CalendarView.css';

export default function CalendarView() {
  const [blocks, setBlocks] = useState([]);
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfStart, setPdfStart] = useState('');
  const [pdfEnd, setPdfEnd] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loggingBlock, setLoggingBlock] = useState(null);
  const [actualMinutes, setActualMinutes] = useState('');

  const getBlockData = (block) => {
    if (block.missed) return { class: 'block-missed', icon: AlertTriangle, label: 'Missed' };
    if (block.completed) return { class: 'block-done', icon: Zap, label: 'Done' };
    if (block.isBreak) return { class: 'block-break', icon: Coffee, label: 'Break' };
    if (block.type === 'Review') return { class: 'block-review', icon: BookOpen, label: 'Review' };
    return { class: 'block-study', icon: CalendarIcon, label: 'Study' };
  };

  useEffect(() => {
    fetchBlocks();
    checkGoogleConnection();
  }, []);

  const fetchBlocks = async () => {
    try {
      const res = await API.get('/schedule');
      setBlocks(res.data);
    } catch (err) {
      console.error('Failed to fetch blocks:', err);
      toast.error('Failed to load schedule');
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const res = await API.get('/auth/user');
      setGoogleConnected(!!res.data.googleTokens?.refresh_token);
    } catch {}
  };

  const handleMarkMissed = async (blockId) => {
    try {
      const res = await API.patch(`/schedule/${blockId}/missed`);
      if (res.data.success) {
        toast.success(`Rescheduled! Created ${res.data.newBlocksCreated} new blocks`);
        fetchBlocks();
        setSelectedDay(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to reschedule');
    }
  };

  const logTime = async () => {
    if (!loggingBlock ||!actualMinutes) return toast.error('Enter minutes');
    try {
      await API.post('/schedule/log', {
        blockId: loggingBlock._id,
        actualMinutes: parseInt(actualMinutes)
      });
      toast.success('Time logged');
      setLoggingBlock(null);
      setActualMinutes('');
      fetchBlocks();
      setSelectedDay(null);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to log time');
    }
  };

  const downloadWeeklyPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL;
      const res = await fetch(`${baseURL}/schedule/export/pdf`, {
        headers: { 'x-auth-token': token }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.msg || 'Failed to download PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-schedule-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed to download PDF');
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

    const activeBlocks = blocks.filter(b =>!b.missed &&!b.completed);

    if (activeBlocks.length === 0) {
      toast.error('No active study blocks to export');
      return;
    }

    activeBlocks.forEach(block => {
      const start = new Date(block.date);
      const [hours, minutes] = block.startTime.split(':');
      start.setHours(parseInt(hours), parseInt(minutes));

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
      const res = await API.post('/schedule/google/sync');
      toast.success(res.data.msg);
      setGoogleConnected(true);
    } catch (err) {
      if (err.response?.data?.needsAuth) {
        const authRes = await API.get('/schedule/google/auth');
        const popup = window.open(authRes.data.url, '_blank', 'width=500,height=600');

        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            checkGoogleConnection();
            toast('Now click Sync to Google again');
          }
        }, 500);
      } else {
        toast.error(err.response?.data?.msg || 'Sync failed');
      }
    } finally {
      setSyncing(false);
    }
  };

  const exportPDF = async () => {
    if (!pdfStart ||!pdfEnd) return toast.error('Select start and end dates');
    setExporting(true);

    const filteredBlocks = blocks.filter(b => {
      const d = b.date.split('T')[0];
      return d >= pdfStart && d <= pdfEnd &&!b.missed;
    });

    if (filteredBlocks.length === 0) {
      toast.error('No study blocks in selected range');
      setExporting(false);
      return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '40px';
    tempDiv.style.background = 'white';
    tempDiv.style.width = '800px';
    tempDiv.innerHTML = `
      <h1 style="margin-bottom: 20px; color: #1f2937;">Study Schedule</h1>
      <p style="color: #6b7280; margin-bottom: 30px;">${pdfStart} to ${pdfEnd}</p>
      ${filteredBlocks.map(b => `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <h3 style="margin: 0 0 4px; color: #1f2937;">${b.subject} - ${b.topic}</h3>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            ${new Date(b.date).toLocaleDateString()} | ${b.startTime} | ${b.duration} min | ${b.type}
          </p>
        </div>
      `).join('')}
    `;
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`study-schedule-${pdfStart}-to-${pdfEnd}.pdf`);
      setShowPdfModal(false);
      toast.success('PDF exported');
    } catch (err) {
      toast.error('PDF export failed');
    } finally {
      document.body.removeChild(tempDiv);
      setExporting(false);
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
    const dateStr = date.toISOString().split('T')[0];
    return blocks.filter(b => b.date.split('T')[0] === dateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
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

  const days = view === 'month'? getMonthDays() : getWeekDays();
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
            <Link size={18} /> {syncing? 'Syncing...' : googleConnected? 'Sync to Google' : 'Connect'}
          </button>
          <button onClick={() => setShowPdfModal(true)} className="btn-cal btn-cal-red">
            <FileText size={18} /> Custom PDF
          </button>
          <div className="view-toggle-pro">
            <button
              onClick={() => setView('month')}
              className={`view-btn-pro ${view === 'month'? 'active' : ''}`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`view-btn-pro ${view === 'week'? 'active' : ''}`}
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
            {selectedDay.blocks.length === 0? (
              <p className="empty-day">No study blocks scheduled</p>
            ) : (
              selectedDay.blocks.map(block => {
                const { icon: Icon } = getBlockData(block);
                return (
                  <div key={block._id} className={`block-detail-pro ${getBlockData(block).class}`}>
                    <div className="block-detail-header-pro">
                      <div className="block-icon">
                        <Icon size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="block-title-pro">
                          {block.startTime} - {block.subject}
                        </div>
                        <div className="block-meta-pro">
                          {block.topic}
                        </div>
                        <div className="block-status-pro">
                          Planned: {block.duration} min | {block.type}
                          {block.actualDuration > 0 && ` | Actual: ${block.actualDuration} min`}
                        </div>
                      </div>
                      <div className="block-actions-pro">
                        {!block.completed &&!block.missed &&!block.isBreak && (
                          <button
                            onClick={() => handleMarkMissed(block._id)}
                            className="missed-btn-pro"
                            title="Mark as missed - will reschedule"
                          >
                            <AlertTriangle size={14} /> Missed
                          </button>
                        )}
                        {block.completed &&!block.isBreak && (
                          <button
                            onClick={() => setLoggingBlock(block)}
                            className="log-btn-pro"
                            title="Log actual time spent"
                          >
                            <Clock size={14} /> {block.actualDuration? 'Update' : 'Log'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
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
                disabled={exporting ||!pdfStart ||!pdfEnd}
                className="btn-primary-pro"
              >
                {exporting? 'Generating...' : 'Export PDF'}
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
            const maxVisible = view === 'week'? 5 : 2;

            return (
              <div
                key={idx}
                className={`day-cell-pro ${view === 'week'? 'week-view' : ''} ${isToday? 'today' : ''} ${view === 'month' &&!isCurrentMonth? 'other-month' : ''}`}
                onClick={() => setSelectedDay({ date: day, blocks: dayBlocks })}
              >
                <div className={`day-number-pro ${isToday? 'today' : ''}`}>
                  {day.getDate()}
                </div>
                {dayBlocks.slice(0, maxVisible).map(block => {
                  const { icon: Icon } = getBlockData(block);
                  return (
                    <div
                      key={block._id}
                      className={`block-pro ${getBlockData(block).class}`}
                      title={`${block.startTime} - ${block.subject}: ${block.topic}`}
                    >
                      <Icon size={12} />
                      <span>{block.startTime} {block.subject}</span>
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