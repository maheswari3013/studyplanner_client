import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Clock, TrendingUp, Shield, Trash2, RefreshCw } from 'lucide-react';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalUsers: 0, totalExams: 0, totalHours: 0, activeToday: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      const msg = err.response?.data?.msg || 'Failed to load admin data';
      setError(msg);
      if (err.response?.status === 403) {
        toast.error('Admin access required');
        setTimeout(() => navigate('/agenda'), 1500);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAdminData();
    setRefreshing(false);
    if (!error) toast.success('Data refreshed');
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Delete user ${name} and all their data? This cannot be undone.`)) return;
    try {
      await API.delete(`/admin/users/${userId}`);
      toast.success('User deleted');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to delete user');
    }
  };

  const handleResetUserData = async (userId, name) => {
    if (!window.confirm(`Reset all study data for ${name}? User account will remain.`)) return;
    try {
      await API.post(`/admin/users/${userId}/reset`);
      toast.success('User data reset');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to reset data');
    }
  };

  if (loading) return <div className="admin-loading">Loading admin dashboard...</div>;
  
  if (error) return (
    <div className="admin-container">
      <div className="admin-error">
        <Shield size={48} />
        <h2>Access Denied</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/agenda')} className="btn-back">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-container">
      <Toaster position="top-right" />
      
      <div className="admin-header">
        <div className="admin-title-row">
          <Shield size={32} />
          <h1 className="admin-title">Admin Dashboard</h1>
        </div>
        <button 
          onClick={handleRefresh} 
          className="btn-refresh"
          disabled={refreshing}
        >
          <RefreshCw size={18} className={refreshing? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-users">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Users</p>
            <p className="stat-value">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-exams">
            <BookOpen size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Exams</p>
            <p className="stat-value">{stats.totalExams}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-hours">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Study Hours Logged</p>
            <p className="stat-value">{stats.totalHours?.toFixed(1) || 0}h</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-active">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Active Today</p>
            <p className="stat-value">{stats.activeToday}</p>
          </div>
        </div>
      </div>

      <div className="users-section">
        <h2 className="section-title">User Management</h2>
        
        {users.length === 0? (
          <div className="empty-state">No users found</div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Exams</th>
                  <th>Hours</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td className="user-name">
                      {user.name}
                      {user.isAdmin && <span className="admin-badge">Admin</span>}
                    </td>
                    <td className="user-email">{user.email}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="text-center">{user.examCount || 0}</td>
                    <td className="text-center">{user.totalHours?.toFixed(1) || 0}h</td>
                    <td>{user.lastActive? new Date(user.lastActive).toLocaleDateString() : 'Never'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleResetUserData(user._id, user.name)}
                          className="btn-action btn-reset"
                          title="Reset user data"
                          disabled={user.isAdmin}
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id, user.name)}
                          className="btn-action btn-delete"
                          title="Delete user"
                          disabled={user.isAdmin}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}