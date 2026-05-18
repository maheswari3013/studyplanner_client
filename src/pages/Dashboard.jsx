import { useState, useEffect, useContext } from 'react';
import API from '../api/axios'; 
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sparkles, TrendingUp, CheckCircle2, AlertCircle, Clock, Zap, BookOpen, Target, RefreshCw, Trash2, Calendar } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/Dashboard.css';

const COLORS = ['#667eea', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [progressData, setProgressData] = useState([]);
  const [readiness, setReadiness] = useState([]);
  const [affirmation, setAffirmation] = useState('');
  const [loggingBlock, setLoggingBlock] = useState(null);
  const [actualMinutes, setActualMinutes] = useState('');
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examsRes, statsRes, blocksRes, progressRes, readinessRes, affirmationRes] = await Promise.all([
        API.get('/schedule/exams'),
        API.get('/schedule/stats'),
        API.get('/schedule'),
        API.get('/schedule/progress'),
        API.get('/schedule/readiness'),
        API.get('/schedule/affirmation')
      ]);
      setExams(examsRes.data);
      setStats(statsRes.data);
      setBlocks(blocksRes.data);
      setProgressData(progressRes.data);
      setReadiness(readinessRes.data);
      setAffirmation(affirmationRes.data.quote);
    } catch (err) {
      console.error('Fetch error:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        logout();
        navigate('/auth');
      } else {
        toast.error('Failed to refresh: ' + (err.response?.data?.msg || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const generateSchedule = async () => {
    setGenerating(true);
    try {
      const config = {
        startDate: startDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        startHour: 9,
        endHour: 18
      };

      const body = { exams, config };
      const res = await API.post('/schedule/generate', body);

      if (!res.data.success) {
        const conflicts = res.data.conflicts || [];
        if (conflicts.length > 0) {
          const msg = conflicts.map(c => {
            if (c.type === 'TOPIC_IMPOSSIBLE') {
              return `${c.topicName}: needs ${c.required?.toFixed(1)}h but only ${c.maxPossible?.toFixed(1)}h available`;
            }
            if (c.type === 'INSUFFICIENT_TIME') {
              return `Need ${c.deficit?.toFixed(1)}h more time`;
            }
            return c.msg || 'Conflict detected';
          }).join('\n');
          toast.error(msg);
        }
        return;
      }

      toast.success(`Generated ${res.data.count} study blocks`);
      setShowDateModal(false);
      setStartDate('');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Error generating schedule');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteExam = async (examId, subject) => {
    if (!window.confirm(`Delete ${subject} exam? This will also delete all its study blocks.`)) return;
    try {
      await API.delete(`/schedule/exams/${examId}`);
      await fetchData();
      toast.success('Exam deleted');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to delete exam');
    }
  };

  const updateConfidence = async (subject, level) => {
    try {
      await API.patch('/schedule/user/confidence', { subject, level });
      toast.success('Confidence updated');
      fetchData();
    } catch {
      toast.error('Failed to update');
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
      fetchData();
    } catch {
      toast.error('Failed to log time');
    }
  };

  const getStatusPieData = () => {
    if (!stats) return [];
    return [
      { name: 'Completed', value: stats.completed },
      { name: 'Remaining', value: stats.remaining },
      { name: 'Missed', value: stats.missed }
    ].filter(d => d.value > 0);
  };

  const getSubjectBarData = () => {
    if (!stats?.bySubject) return [];
    return stats.bySubject.map(s => ({
      subject: s._id,
      completed: s.completed,
      total: s.total,
      percentage: Math.round((s.completed / s.total) * 100)
    }));
  };

  const getDailyHoursData = () => {
    const dailyMap = {};
    blocks.forEach(b => {
      if (b.isBreak) return;
      const date = new Date(b.date).toLocaleDateString('en-CA');
      if (!dailyMap[date]) dailyMap[date] = { date, hours: 0 };
      dailyMap[date].hours += b.duration / 60;
    });

    return Object.values(dailyMap)
     .sort((a, b) => new Date(a.date) - new Date(b.date))
     .slice(-7)
     .map(d => ({...d, hours: Number(d.hours.toFixed(1)) }));
  };

  const getRingColor = (pct) => pct >= 80? '#10b981' : pct >= 50? '#f59e0b' : '#ef4444';

  if (loading) return (
    <div className="dash-container">
      <div className="dash-loading">
        <RefreshCw className="dash-spin" size={32} />
        <p>Loading your dashboard...</p>
      </div>
    </div>
  );

  const hasData = stats && stats.total > 0;

  return (
    <div className="dash-container">
      <Toaster position="top-right" />

      {affirmation && (
        <div className="dash-affirmation">
          <Sparkles size={24} />
          <p className="dash-quote">"{affirmation}"</p>
        </div>
      )}

      <div className="dash-header">
        <div>
          <h2 className="dash-title">Dashboard</h2>
          <p className="dash-subtitle">Track your progress and stay on top of exams</p>
        </div>
      </div>

      {exams.length > 0 && (
        <div className="dash-section">
          <h3 className="dash-section-title">
            <Calendar size={20} />
            Your Exams
          </h3>
          <div className="dash-exams-grid">
            {exams.map(exam => (
              <div key={exam._id} className="dash-exam-card">
                <div className="dash-exam-header">
                  <div>
                    <div className="dash-exam-subject">{exam.subject}</div>
                    <div className="dash-exam-date">
                      <Calendar size={14} />
                      {new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="dash-exam-meta">
                      <BookOpen size={14} />
                      {Array.isArray(exam.syllabusTopics)
                       ? exam.syllabusTopics.map(t => typeof t === 'string'? t : t.name).join(', ')
                        : ''}
                    </div>
                    {exam.totalScheduledHours && (
                      <div className="dash-exam-progress">
                        <div className="dash-progress-bar-mini">
                          <div
                            className="dash-progress-fill-mini"
                            style={{ width: `${(exam.completedHours / exam.totalScheduledHours) * 100}%` }}
                          ></div>
                        </div>
                        <span>{exam.completedHours || 0}h / {exam.totalScheduledHours}h</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteExam(exam._id, exam.subject)}
                    className="dash-btn-delete"
                    title="Delete exam"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="dash-btn-generate"
        onClick={() => setShowDateModal(true)}
        disabled={generating || exams.length === 0}
      >
        <Zap size={20} />
        {generating? 'Generating...' : 'Generate Study Schedule'}
      </button>

      {showDateModal && (
        <div className="dash-modal-overlay">
          <div className="dash-modal">
            <h3 className="dash-modal-title">
              <Calendar size={24} />
              When should we start?
            </h3>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="dash-modal-input"
            />
            <div className="dash-modal-actions">
              <button
                onClick={generateSchedule}
                disabled={generating}
                className="dash-btn-primary"
              >
                {generating? 'Generating...' : startDate? 'Start from this date' : 'Start tomorrow'}
              </button>
              <button
                onClick={() => { setShowDateModal(false); setStartDate(''); }}
                className="dash-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasData? (
        <div className="dash-empty">
          <Target size={48} />
          <h3>No study data yet</h3>
          <p>Add exams and click "Generate Study Schedule" to get started</p>
        </div>
      ) : (
        <>
          {progressData.length > 0 && (
            <div className="dash-section">
              <h3 className="dash-section-title">
                <TrendingUp size={20} />
                Subject Progress
              </h3>
              <div className="dash-rings-grid">
                {progressData.map(p => (
                  <div key={p.subject} className="dash-ring-item">
                    <div className="dash-ring" style={{
                      background: `conic-gradient(${getRingColor(p.percentComplete)} ${p.percentComplete * 3.6}deg, #e5e7eb 0deg)`
                    }}>
                      <div className="dash-ring-inner">
                        <span className="dash-percent">{p.percentComplete}%</span>
                      </div>
                    </div>
                    <p className="dash-ring-label">{p.subject}</p>
                    <p className="dash-ring-sub">{p.hoursCompleted}/{p.hoursPlanned}h planned</p>
                    <p className="dash-ring-sub actual">Actual: {p.hoursActual}h</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {readiness.length > 0 && (
            <div className="dash-section">
              <h3 className="dash-section-title">
                <Target size={20} />
                Exam Readiness
              </h3>
              {readiness.map(r => (
                <div key={r.subject} className="dash-readiness-card">
                  <div className="dash-readiness-header">
                    <span className="dash-readiness-subject">{r.subject}</span>
                    <span className={`dash-score ${r.readiness >= 70? 'high' : r.readiness >= 40? 'mid' : 'low'}`}>
                      {r.readiness}%
                    </span>
                  </div>
                  <div className="dash-readiness-bar">
                    <div className="dash-bar-fill" style={{ width: `${r.readiness}%` }}></div>
                  </div>
                  <div className="dash-confidence-slider">
                    <label>Confidence: {r.confidence}/10</label>
                    <input
                      type="range" min="1" max="10" value={r.confidence}
                      onChange={(e) => updateConfidence(r.subject, parseInt(e.target.value))}
                    />
                  </div>
                  <div className="dash-readiness-stats">
                    <span><Clock size={14} /> {r.daysLeft} days left</span>
                    <span>Completion: {r.completionScore}%</span>
                    <span>Confidence: {r.confidenceScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="dash-stats-grid">
            <div className="dash-stat-card total">
              <div className="dash-stat-icon"><BookOpen size={24} /></div>
              <h3>{stats.total}</h3>
              <p>Total Blocks</p>
            </div>
            <div className="dash-stat-card green">
              <div className="dash-stat-icon"><CheckCircle2 size={24} /></div>
              <h3>{stats.completed}</h3>
              <p>Completed</p>
            </div>
            <div className="dash-stat-card red">
              <div className="dash-stat-icon"><AlertCircle size={24} /></div>
              <h3>{stats.missed}</h3>
              <p>Missed</p>
            </div>
            <div className="dash-stat-card blue">
              <div className="dash-stat-icon"><Clock size={24} /></div>
              <h3>{stats.remaining}</h3>
              <p>Remaining</p>
            </div>
            <div className="dash-stat-card purple">
              <div className="dash-stat-icon"><TrendingUp size={24} /></div>
              <h3>{stats.completionRate}%</h3>
              <p>Completion Rate</p>
            </div>
          </div>

          <div className="dash-charts-grid">
            <div className="dash-chart-card">
              <h3 className="dash-chart-title">Study Status</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={getStatusPieData()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {getStatusPieData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Completed'? '#10b981' : entry.name === 'Missed'? '#ef4444' : '#667eea'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="dash-chart-card">
              <h3 className="dash-chart-title">Hours Per Day - Last 7 Days</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={getDailyHoursData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="100%" stopColor="#764ba2" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dash-subject-chart">
            <h3 className="dash-chart-title">Progress By Subject</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={getSubjectBarData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 'dataMax']} />
                <YAxis dataKey="subject" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[0, 8, 8, 0]} />
                <Bar dataKey="total" fill="#e5e7eb" name="Total" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-section">
            <h3 className="dash-section-title">
              <Clock size={20} />
              Recent Study Blocks - Log Actual Time
            </h3>
            <div className="dash-blocks-list">
              {blocks.filter(b =>!b.isBreak && b.completed).slice(-5).reverse().map(block => (
                <div key={block._id} className="dash-block-log">
                  <div>
                    <div className="dash-block-title">{block.subject} - {block.topic}</div>
                    <div className="dash-block-meta">
                      {new Date(block.date).toLocaleDateString()} | Planned: {block.duration}min |
                      <span className={block.actualDuration? 'dash-actual-set' : 'dash-actual-missing'}>
                        Actual: {block.actualDuration || 0}min
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setLoggingBlock(block)}
                    className="dash-btn-log"
                  >
                    {block.actualDuration? 'Update' : 'Log Time'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {loggingBlock && (
        <div className="dash-modal-overlay">
          <div className="dash-modal">
            <h3 className="dash-modal-title">
              <Clock size={24} />
              Log Actual Study Time
            </h3>
            <p className="dash-modal-sub">{loggingBlock.subject} - {loggingBlock.topic}</p>
            <p className="dash-modal-info">Planned: {loggingBlock.duration} minutes</p>
            <input
              type="number"
              placeholder="Actual minutes spent"
              value={actualMinutes}
              onChange={(e) => setActualMinutes(e.target.value)}
              className="dash-modal-input"
              autoFocus
            />
            <div className="dash-modal-actions">
              <button onClick={logTime} className="dash-btn-primary">Save</button>
              <button onClick={() => { setLoggingBlock(null); setActualMinutes(''); }} className="dash-btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="dash-btn-refresh" onClick={fetchData} disabled={loading}>
        <RefreshCw size={18} className={loading? 'dash-spin' : ''} />
        {loading? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}