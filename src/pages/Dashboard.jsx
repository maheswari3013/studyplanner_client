import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, BookOpen, Clock, TrendingUp, AlertCircle, CheckCircle2, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/Dashboard.css';

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [blocksRes, examsRes, statsRes] = await Promise.all([
        API.get('/blocks/today'),
        API.get('/exams/upcoming'),
        API.get('/user/stats')
      ]);

      setTodayBlocks(blocksRes.data || []);
      setUpcomingExams(examsRes.data?.slice(0, 3) || []);
      setStats(statsRes.data || stats);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const completeBlock = async (blockId) => {
    try {
      await API.patch(`/blocks/${blockId}/complete`);
      toast.success('Block completed!');
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to complete block');
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

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

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

      <div className="dashboard-content">
        <div className="content-section">
          <div className="section-header">
            <h2 className="section-title">
              <Clock size={20} />
              Today's Study Blocks
            </h2>
            <button 
              onClick={() => navigate('/agenda')} 
              className="btn-link"
            >
              View All
            </button>
          </div>

          {todayBlocks.length === 0 ? (
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
                <div key={block._id} className={`block-item ${block.completed ? 'completed' : ''}`}>
                  <div className="block-time">
                    {new Date(block.startTime).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  <div className="block-content">
                    <h4 className="block-title">{block.topic?.name || block.title}</h4>
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
              <Calendar size={20} />
              Upcoming Exams
            </h2>
            <button 
              onClick={() => navigate('/exams')} 
              className="btn-link"
            >
              View All
            </button>
          </div>

          {upcomingExams.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={48} />
              <p>No upcoming exams</p>
              <button onClick={() => navigate('/exams')} className="btn-primary">
                Add Exam
              </button>
            </div>
          ) : (
            <div className="exams-list">
              {upcomingExams.map(exam => {
                const daysLeft = Math.ceil((new Date(exam.date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={exam._id} className="exam-item">
                    <div className="exam-date">
                      <span className="exam-day">{new Date(exam.date).getDate()}</span>
                      <span className="exam-month">
                        {new Date(exam.date).toLocaleString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    <div className="exam-content">
                      <h4 className="exam-title">{exam.subject}</h4>
                      <p className="exam-desc">{exam.description || 'No description'}</p>
                    </div>
                    <div className={`exam-countdown ${daysLeft <= 7 ? 'urgent' : ''}`}>
                      <AlertCircle size={16} />
                      <span>{daysLeft}d left</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}