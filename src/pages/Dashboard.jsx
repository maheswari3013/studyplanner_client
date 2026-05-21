import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, Server, AlertTriangle, RefreshCw, Shield, Cpu, HardDrive, Mail, Trash2 } from 'lucide-react';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import '../assets/AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [errors, setErrors] = useState(null);
  const [users, setUsers] = useState([]);
  const [otps, setOtps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdminData = async () => {
    if (!loading) setRefreshing(true);
    setError(null);
    try {
      const [healthRes, metricsRes, errorsRes, usersRes, otpsRes] = await Promise.all([
        API.get('/admin/health'),
        API.get('/admin/metrics'),
        API.get('/admin/errors'),
        API.get('/admin/users'),
        API.get('/admin/otps')
      ]);
      setHealth(healthRes.data);
      setMetrics(metricsRes.data);
      setErrors(errorsRes.data);
      setUsers(usersRes.data);
      setOtps(otpsRes.data);
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
      setRefreshing(false);
    }
  };

  const deleteUser = async (id, email) => {
    if (!confirm(`Delete user ${email}?`)) return;
    try {
      await API.delete(`/admin/user/${id}`);
      toast.success('User deleted');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Delete failed');
    }
  };

  const toggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'admin'? 'user' : 'admin';
    try {
      await API.patch(`/admin/user/${id}/role`, { role: newRole });
      toast.success(`User role changed to ${newRole}`);
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to update role');
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
          <h1 className="admin-title">System Monitor</h1>
          <span className={`status-badge ${health?.status === 'ok'? 'status-ok' : 'status-error'}`}>
            {health?.status === 'ok'? 'Online' : 'Degraded'}
          </span>
        </div>
        <button 
          onClick={fetchAdminData} 
          className="btn-refresh"
          disabled={refreshing}
        >
          <RefreshCw size={18} className={refreshing? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview'? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users'? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({metrics?.users?.total || 0})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'otps'? 'active' : ''}`}
          onClick={() => setActiveTab('otps')}
        >
          OTP Logs ({metrics?.otps?.active || 0})
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-server">
                <Server size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">DB Status</p>
                <p className="stat-value">{health?.db || 'unknown'}</p>
                <p className="stat-sub">Uptime: {health?.uptime || 0}m</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-cpu">
                <Cpu size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">CPU Load</p>
                <p className="stat-value">{health?.cpu || 0}</p>
                <p className="stat-sub">Node {health?.nodeVersion}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-memory">
                <HardDrive size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">Memory</p>
                <p className="stat-value">{health?.memory?.used || 0} MB</p>
                <p className="stat-sub">Heap used</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-users">
                <Users size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">Active Users</p>
                <p className="stat-value">{metrics?.users?.active24h || 0}</p>
                <p className="stat-sub">Last 24h / {metrics?.users?.total || 0} total</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-blocks">
                <Activity size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">Blocks Today</p>
                <p className="stat-value">{metrics?.blocks?.completedToday || 0}</p>
                <p className="stat-sub">{metrics?.blocks?.overdue || 0} overdue</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-errors">
                <AlertTriangle size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">System Errors</p>
                <p className="stat-value">{(errors?.cronFailures || 0) + (errors?.schedulerFailures || 0)}</p>
                <p className="stat-sub">Cron: {errors?.cronFailures || 0} | Sched: {errors?.schedulerFailures || 0}</p>
              </div>
            </div>
          </div>

          <div className="error-section">
            <h2 className="section-title">Error Breakdown</h2>
            <div className="error-grid">
              <div className="error-card">
                <h3>Cron Failures</h3>
                <p className="error-count">{errors?.cronFailures || 0}</p>
                <p className="error-desc">Overdue blocks not rescheduled &gt; 1h</p>
              </div>
              <div className="error-card">
                <h3>Scheduler Failures</h3>
                <p className="error-count">{errors?.schedulerFailures || 0}</p>
                <p className="error-desc">Topics with 10h+ unscheduled</p>
              </div>
            </div>
            <p className="last-checked">Last checked: {new Date(errors?.lastChecked).toLocaleTimeString()}</p>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="admin-table-wrapper">
          <h2 className="section-title">All Users</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>{u.email}</td>
                  <td>{u.username}</td>
                  <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="actions">
                    <button onClick={() => toggleRole(u._id, u.role)} className="btn-small">
                      {u.role === 'admin'? 'Demote' : 'Promote'}
                    </button>
                    {u.role!== 'admin' && 
                      <button onClick={() => deleteUser(u._id, u.email)} className="btn-small danger">
                        <Trash2 size={14} />
                      </button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'otps' && (
        <div className="admin-table-wrapper">
          <h2 className="section-title">Recent OTPs - Debug SendGrid</h2>
          <p className="section-desc">Use this to see generated OTPs when Gmail blocks emails</p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Type</th>
                <th>OTP Code</th>
                <th>Created</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {otps.map(o => (
                <tr key={o._id}>
                  <td>{o.email}</td>
                  <td><span className={`type-badge ${o.type}`}>{o.type}</span></td>
                  <td><code className="otp-code">{o.otp}</code></td>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                  <td>{new Date(o.expiresAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}