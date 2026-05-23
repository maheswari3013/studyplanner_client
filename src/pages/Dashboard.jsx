import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Clock, TrendingUp, CheckCircle2,
  Target, Zap, Smile, BarChart3, Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/Dashboard.css';

const AFFIRMATIONS = [
  "You've got this. One topic at a time.",
  "Progress, not perfection. Keep going.",
  "Your future self will thank you for studying today.",
  "Small steps every day lead to big results.",
  "Believe in your ability to figure things out.",
  "Stressed spelled backwards is desserts. Take a break.",
  "You're closer than you were yesterday."
];

const CircularProgress = ({ percent, label, subtext }) => {
  const size = 112;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth={strokeWidth} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#2563EB"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{Math.round(safePercent)}%</span>
        </div>
      </div>
      <div className="text-sm font-medium mt-2">{label}</div>
      <div className="text-xs text-gray-500">{subtext}</div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayBlocks: 0,
    completedToday: 0,
    upcomingExams: 0,
    totalTopics: 0,
    studyStreak: 0
  });
  const [todayBlocks, setTodayBlocks] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [subjectProgress, setSubjectProgress] = useState([]);
  const [confidence, setConfidence] = useState({});
  const [studyLogs, setStudyLogs] = useState([]);
  const [affirmation, setAffirmation] = useState('');

  useEffect(() => {
    fetchDashboardData();
    setAffirmation(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [blocksRes, examsRes, statsRes, progressRes, logsRes, confidenceRes] = await Promise.all([
        API.get('/schedule/today'),
        API.get('/schedule/upcoming'),
        API.get('/schedule/user/stats'),
        API.get('/schedule/user/subject-progress'),
        API.get('/schedule/user/study-logs'),
        API.get('/schedule/user/confidence')
      ]);

      setTodayBlocks(blocksRes.data || []);
      setUpcomingExams(examsRes.data?.slice(0, 3) || []);
      setStats(statsRes.data || stats);
      setSubjectProgress(progressRes.data || []);
      setStudyLogs(logsRes.data || []);
      setConfidence(confidenceRes.data || {});
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const completeBlock = async (blockId) => {
    try {
      await API.patch(`/schedule/${blockId}/complete`);
      toast.success('Block completed!');
      fetchDashboardData();
    } catch (err) {
      if (err.response?.status === 404) {
        toast('Schedule was regenerated. Refreshing...');
        fetchDashboardData();
      } else {
        toast.error('Failed to complete block');
      }
    }
  };

  const updateConfidence = async (examId, level) => {
    try {
      await API.patch(`/exams/${examId}/confidence`, { level });
      setConfidence(prev => ({...prev, [examId]: level }));
      toast.success('Confidence updated');
    } catch (err) {
      toast.error('Failed to update confidence');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getProgressPercent = () => {
    if (stats.todayBlocks === 0) return 0;
    return Math.round((stats.completedToday / stats.todayBlocks) * 100);
  };

  const getReadinessScore = (examId) => {
    const level = confidence[examId] || 0;
    const scores = { 1: 25, 2: 50, 3: 75, 4: 100 };
    return scores[level] || 0;
  };

  const getConfidenceLabel = (level) => {
    return { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High' }[level] || 'Not set';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  const isHeavyWeek = stats.todayBlocks >= 3;

  return (
    <div className="dashboard-container">
      <Toaster position="top-right" />

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            {getGreeting()}, {user?.username || 'Student'}!
          </h1>
          <p className="dashboard-subtitle">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        {isHeavyWeek && (
          <div className="affirmation-card">
            <Heart size={20} />
            <p>{affirmation}</p>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-today">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Today's Progress</p>
            <p className="stat-value">{stats.completedToday}/{stats.todayBlocks}</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${getProgressPercent()}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-exams">
            <BookOpen size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Upcoming Exams</p>
            <p className="stat-value">{stats.upcomingExams}</p>
            <p className="stat-sub">Next 30 days</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-topics">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Active Topics</p>
            <p className="stat-value">{stats.totalTopics}</p>
            <p className="stat-sub">In progress</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-streak">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Study Streak</p>
            <p className="stat-value">{stats.studyStreak} days</p>
            <p className="stat-sub">Keep it up!</p>
          </div>
        </div>
      </div>

      {subjectProgress.length > 0 && (
        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">
              <Target size={20} />
              Revision Plan Progress
            </h2>
          </div>
          <div className="progress-rings">
            {subjectProgress.map(sub => {
              const completedHours = Number(sub.completed) || 0;
              const totalHours = Number(sub.planned) || 0;
              const percent = totalHours > 0 ? (completedHours / totalHours) * 100 : 0;

              return (
                <div key={sub.subject} className="ring-item">
                  <CircularProgress
                    percent={percent}
                    label={sub.subject}
                    subtext={`${completedHours.toFixed(1)}/${totalHours.toFixed(1)}h`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="dashboard-content">
        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">
              <Clock size={20} />
              Today's Study Blocks
            </h2>
            <button onClick={() => navigate('/agenda')} className="btn-link">
              View All
            </button>
          </div>

          {todayBlocks.length === 0? (
            <div className="empty-state">
              <CheckCircle2 size={48} />
              <p>No blocks scheduled for today</p>
              <button onClick={() => navigate('/calendar')} className="btn-primary">
                Plan Your Day
              </button>
            </div>
          ) : (
            <div className="blocks-list">
              {todayBlocks.slice(0, 5).map(block => (
                <div key={block._id} className={`block-item ${block.completed? 'completed' : ''}`}>
                  <div className="block-time">
                    {new Date(`1970-01-01T${block.time}:00`).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="block-content">
                    <h4 className="block-title">{block.topic?.name || block.topic}</h4>
                    <p className="block-duration">{block.duration} minutes</p>
                  </div>
                  {!block.completed && (
                    <button
                      onClick={() => completeBlock(block._id)}
                      className="btn-complete"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                  {block.completed && (
                    <div className="block-done">
                      <CheckCircle2 size={18} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">
              <Zap size={20} />
              Confidence Tracker
            </h2>
          </div>

          {upcomingExams.length === 0? (
            <div className="empty-state">
              <BookOpen size={48} />
              <p>No upcoming exams to track</p>
            </div>
          ) : (
            <div className="confidence-list">
              {upcomingExams.map(exam => {
                const daysLeft = Math.ceil((new Date(exam.examDate) - new Date()) / (1000 * 60 * 60 * 24));
                const readiness = getReadinessScore(exam._id);
                const level = confidence[exam._id] || 0;

                return (
                  <div key={exam._id} className="confidence-item">
                    <div className="confidence-header">
                      <h4>{exam.subject}</h4>
                      <span className="days-left">{daysLeft}d left</span>
                    </div>
                    <div className="readiness-bar">
                      <div className="readiness-fill" style={{ width: `${readiness}%` }}>
                        <span>{readiness}% Ready</span>
                      </div>
                    </div>
                    <div className="confidence-buttons">
                      {[1,2,3,4].map(l => (
                        <button
                          key={l}
                          className={`conf-btn ${level === l? 'active' : ''}`}
                          onClick={() => updateConfidence(exam._id, l)}
                        >
                          <Smile size={16} />
                          {getConfidenceLabel(l)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {studyLogs.length > 0 && (
        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">
              <BarChart3 size={20} />
              Study Log: Planned vs Actual
            </h2>
          </div>
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Planned Hours</th>
                  <th>Actual Hours</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {studyLogs.map(log => {
                  const diff = log.actual - log.planned;
                  return (
                    <tr key={log.subject}>
                      <td>{log.subject}</td>
                      <td>{log.planned}h</td>
                      <td>{log.actual}h</td>
                      <td className={diff >= 0? 'positive' : 'negative'}>
                        {diff > 0? '+' : ''}{diff}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
