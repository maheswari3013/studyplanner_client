import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Calendar, BookOpen, User, LogOut, ListTodo, Zap, Shield } from 'lucide-react';
import '../assets/Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1' },
    { path: '/agenda', label: 'Today\'s Agenda', icon: ListTodo, color: '#8b5cf6' },
    { path: '/calendar', label: 'Calendar', icon: Calendar, color: '#ec4899' },
    { path: '/exams', label: 'Exams', icon: BookOpen, color: '#f59e0b' },
    { path: '/profile', label: 'Profile', icon: User, color: '#06b6d4' },
  ...(user?.isAdmin? [
      { path: '/admin', label: 'Admin', icon: Shield, color: '#dc2626' }
    ] : [])
  ];

  if (!user) return null;

  return (
    <nav className="navbar-pro">
      <div className="nav-container">
        <Link to="/dashboard" className="nav-logo-pro">
          <div className="logo-icon">
            <Zap size={24} />
          </div>
          <span className="logo-text">StudySync</span>
        </Link>

        <div className="nav-links">
          {navItems.map(({ path, label, icon: Icon, color }) => (
            <Link
              key={path}
              to={path}
              title={label}
              className={`nav-link-pro ${location.pathname === path? 'active' : ''}`}
              style={{ '--accent': color }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        <div className="nav-user">
          <div className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="nav-username">{user.name}</span>
            <span className="nav-role">{user.isAdmin? 'Admin' : 'Student'}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout-pro" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}