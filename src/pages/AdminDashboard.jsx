import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Users, Server, AlertTriangle, RefreshCw, Shield, Cpu, 
  HardDrive, Search, Trash2, UserCheck, KeyRound, Clock, Mail, ChevronRight 
} from 'lucide-react';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import StyledButton from '../components/StyledButton';
import '../assets/AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Expanded states for new features
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'users' | 'otps'
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [otps, setOtps] = useState([]);
  const [otpsLoading, setOtpsLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(() => {
      if (activeTab === 'metrics') fetchAdminData();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'otps') {
      fetchOtps();
    }
  }, [activeTab]);

  const fetchAdminData = async () => {
    if (!loading) setRefreshing(true);
    setError(null);
    try {
      const [healthRes, metricsRes, errorsRes] = await Promise.all([
        API.get('/admin/health'),
        API.get('/admin/metrics'),
        API.get('/admin/errors')
      ]);
      setHealth(healthRes.data);
      setMetrics(metricsRes.data);
      setErrors(errorsRes.data);
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

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await API.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchOtps = async () => {
    setOtpsLoading(true);
    try {
      const res = await API.get('/admin/otps');
      setOtps(res.data);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to load OTPs');
    } finally {
      setOtpsLoading(false);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      await API.patch(`/admin/user/${userId}/role`, { role: newRole });
      toast.success('User role updated');
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete user "${username}"? All exams, timetables, and notifications will be deleted. This cannot be undone.`)) return;

    try {
      await API.delete(`/admin/user/${userId}`);
      toast.success(`Deleted user "${username}"`);
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to delete user');
    }
  };

  const handleRefreshCurrentTab = () => {
    if (activeTab === 'metrics') fetchAdminData();
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'otps') fetchOtps();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = 
      roleFilter === 'all' || 
      user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (loading) return (
    <DashboardLayout>
      <div className="admin-loading">Loading admin dashboard...</div>
    </DashboardLayout>
  );
  
  if (error) return (
    <DashboardLayout>
      <div className="admin-container">
        <GlassCard className="admin-error">
          <Shield size={48} />
          <h2>Access Denied</h2>
          <p>{error}</p>
          <StyledButton onClick={() => navigate('/agenda')} variant="primary">
            Back to Dashboard
          </StyledButton>
        </GlassCard>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="admin-container">
        <Toaster position="top-right" />
        
        {/* Header Block */}
        <div className="admin-header">
          <div className="admin-title-row">
            <Shield size={32} />
            <h1 className="admin-title">System Monitor</h1>
            <span className={`status-badge ${health?.status === 'ok' ? 'status-ok' : 'status-error'}`}>
              {health?.status === 'ok' ? 'Online' : 'Degraded'}
            </span>
          </div>
          
          <StyledButton 
            onClick={handleRefreshCurrentTab} 
            disabled={refreshing || usersLoading || otpsLoading}
            icon={RefreshCw}
          >
            {refreshing || usersLoading || otpsLoading ? 'Refreshing...' : 'Refresh'}
          </StyledButton>
        </div>

        {/* Tab Navigation */}
        <div className="admin-tabs">
          <button 
            className={`admin-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            <Activity size={16} />
            System Metrics
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} />
            User Management ({metrics?.users?.total || 0})
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'otps' ? 'active' : ''}`}
            onClick={() => setActiveTab('otps')}
          >
            <KeyRound size={16} />
            OTP logs ({metrics?.otps?.active || 0} Active)
          </button>
        </div>

        {/* Tab Content 1: System Metrics */}
        {activeTab === 'metrics' && (
          <>
            <div className="stats-grid">
              <GlassCard className="stat-card">
                <div className="stat-icon stat-server">
                  <Server size={24} />
                </div>
                <div className="stat-content">
                  <p className="stat-label">DB Status</p>
                  <p className="stat-value">{health?.db || 'unknown'}</p>
                  <p className="stat-sub">Uptime: {health?.uptime || 0}m</p>
                </div>
              </GlassCard>

              <GlassCard className="stat-card">
                <div className="stat-icon stat-cpu">
                  <Cpu size={24} />
                </div>
                <div className="stat-content">
                  <p className="stat-label">CPU Load</p>
                  <p className="stat-value">{health?.cpu || 0}</p>
                  <p className="stat-sub">Node {health?.nodeVersion}</p>
                </div>
              </GlassCard>

              <GlassCard className="stat-card">
                <div className="stat-icon stat-memory">
                  <HardDrive size={24} />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Memory</p>
                  <p className="stat-value">{health?.memory?.memoryUsed || 0} GB</p>
                  <p className="stat-sub">Heap: {health?.memory?.total || 0} GB</p>
                </div>
              </GlassCard>

              <GlassCard className="stat-card">
                <div className="stat-icon stat-users">
                  <Users size={24} />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Active Users</p>
                  <p className="stat-value">{metrics?.users?.active24h || 0}</p>
                  <p className="stat-sub">Last 24h / {metrics?.users?.total || 0} total</p>
                </div>
              </GlassCard>

              <GlassCard className="stat-card">
                <div className="stat-icon stat-blocks">
                  <Activity size={24} />
                </div>
                <div className="stat-content">
                  <p className="stat-label">Blocks Today</p>
                  <p className="stat-value">{metrics?.blocks?.completedToday || 0}</p>
                  <p className="stat-sub">{metrics?.blocks?.overdue || 0} overdue</p>
                </div>
              </GlassCard>

              <GlassCard className="stat-card">
                <div className="stat-icon stat-errors">
                  <AlertTriangle size={24} />
                </div>
                <div className="stat-content">
                  <p className="stat-label">System Errors</p>
                  <p className="stat-value">{(errors?.cronFailures || 0) + (errors?.schedulerFailures || 0)}</p>
                  <p className="stat-sub">Cron: {errors?.cronFailures || 0} | Sched: {errors?.schedulerFailures || 0}</p>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="error-section">
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
              <p className="last-checked">Last checked: {errors?.lastChecked ? new Date(errors.lastChecked).toLocaleTimeString() : 'Never'}</p>
            </GlassCard>
          </>
        )}

        {/* Tab Content 2: User Management */}
        {activeTab === 'users' && (
          <GlassCard className="admin-management-card">
            <div className="filter-controls-row">
              <div className="search-box-wrapper">
                <Search size={18} className="search-icon-inside" />
                <input 
                  type="text" 
                  placeholder="Search user by username or email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <select 
                value={roleFilter} 
                onChange={e => setRoleFilter(e.target.value)}
                className="admin-role-select"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>

            {usersLoading ? (
              <div className="tab-loading-state">Fetching active accounts...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="tab-empty-state">No users match your criteria</div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Info</th>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Registered</th>
                      <th>Last Active</th>
                      <th className="actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(userItem => (
                      <tr key={userItem._id}>
                        <td>
                          <div className="user-info-cell">
                            <div className="user-avatar-small">
                              {userItem.avatar ? (
                                <img src={userItem.avatar} alt="" className="avatar-img" />
                              ) : (
                                (userItem.username || userItem.name || 'U').charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="username-text">{userItem.username || userItem.name}</span>
                          </div>
                        </td>
                        <td><span className="email-text">{userItem.email}</span></td>
                        <td>
                          <span className={`role-pill ${userItem.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                            {userItem.role}
                          </span>
                        </td>
                        <td>
                          <span className="date-text">
                            {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className="date-text">
                            {userItem.lastActive ? new Date(userItem.lastActive).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button 
                              onClick={() => handleToggleRole(userItem._id, userItem.role)}
                              className="admin-action-btn role-toggle-btn"
                              title={userItem.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            >
                              <UserCheck size={16} />
                              Role
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(userItem._id, userItem.username || userItem.email)}
                              className="admin-action-btn delete-btn"
                              title="Delete Account permanently"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}

        {/* Tab Content 3: OTP Logs */}
        {activeTab === 'otps' && (
          <GlassCard className="admin-management-card">
            <div className="table-header-row">
              <h2 className="table-section-title">Active verification and recovery codes</h2>
              <p className="table-section-desc">Exposes codes directly to support manual verification or debugging flows.</p>
            </div>

            {otpsLoading ? (
              <div className="tab-loading-state">Accessing database OTP tables...</div>
            ) : otps.length === 0 ? (
              <div className="tab-empty-state">No verification codes found in the system.</div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Recipient Email</th>
                      <th>One-Time Code</th>
                      <th>Expiration</th>
                      <th>Created</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otps.map(otpItem => {
                      const isExpired = new Date(otpItem.expiresAt) < new Date();
                      return (
                        <tr key={otpItem._id}>
                          <td>
                            <div className="otp-email-cell">
                              <Mail size={14} className="cell-icon-muted" />
                              <span>{otpItem.email}</span>
                            </div>
                          </td>
                          <td>
                            <code className="otp-code-block">{otpItem.otp}</code>
                          </td>
                          <td>
                            <div className="otp-date-cell">
                              <Clock size={14} className="cell-icon-muted" />
                              <span>{new Date(otpItem.expiresAt).toLocaleTimeString()}</span>
                            </div>
                          </td>
                          <td>
                            <span className="date-text">
                              {new Date(otpItem.createdAt).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${isExpired ? 'otp-expired' : 'otp-valid'}`}>
                              {isExpired ? 'Expired' : 'Valid'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
}