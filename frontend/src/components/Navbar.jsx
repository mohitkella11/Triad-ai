import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Search, 
  Sliders, 
  LogOut, 
  User as UserIcon, 
  Inbox, 
  Building2,
  Shield
} from 'lucide-react';
import api from '../services/api';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user) {
      const fetchPending = async () => {
        try {
          const res = await api.get('/access/requests?type=incoming');
          const incoming = res.data.requests || [];
          const pending = incoming.filter(r => r.status === 'pending');
          setPendingCount(pending.length);
        } catch (e) {
          // Silent ignore
        }
      };
      fetchPending();
      const interval = setInterval(fetchPending, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <Link to={user ? "/" : "/login"} className="brand-logo">
          <div className="brand-icon-box">
            <FileText size={20} className="brand-icon" />
          </div>
          <div className="brand-text">
            <span className="brand-title">TRIAD AI</span>
            <span className="brand-badge">DMS</span>
          </div>
        </Link>

        {/* Navigation Links - ONLY VISIBLE AFTER LOGGING IN */}
        {user && (
          <nav className="nav-links">
            <Link 
              to="/" 
              className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
            >
              <FileText size={17} />
              <span>Document Hub</span>
            </Link>

            <Link 
              to="/search" 
              className={`nav-item ${location.pathname === '/search' ? 'active' : ''}`}
            >
              <Search size={17} />
              <span>Advanced Search</span>
            </Link>

            <Link 
              to="/requests" 
              className={`nav-item ${location.pathname === '/requests' ? 'active' : ''}`}
            >
              <Inbox size={17} />
              <span>Access Requests</span>
              {pendingCount > 0 && (
                <span className="notification-pill">{pendingCount}</span>
              )}
            </Link>

            <Link 
              to="/settings" 
              className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
            >
              <Sliders size={17} />
              <span>Metadata Settings</span>
            </Link>
          </nav>
        )}

        {/* Actions / User Profile - ONLY VISIBLE AFTER LOGGING IN */}
        <div className="navbar-actions">
          {user ? (
            <div className="user-profile-bar">
              <div className="division-chip">
                <Building2 size={13} />
                <span>{user.division || 'Division A'}</span>
              </div>
              <div className="user-info-chip">
                <UserIcon size={13} />
                <span className="user-name">{user.username}</span>
                {user.role === 'admin' && <span className="admin-tag">Admin</span>}
              </div>
              <button 
                onClick={handleLogout} 
                className="btn-logout"
                title="Log out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="logged-out-indicator">
              <Shield size={14} className="security-icon" />
              <span>Protected Portal</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
