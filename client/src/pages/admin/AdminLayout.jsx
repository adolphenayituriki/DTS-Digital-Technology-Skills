import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, FileText, Star, Calendar, ClipboardList, LogOut } from 'lucide-react';

const navItems = [
  { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
  { to: '/admin/messages', icon: <MessageSquare size={18} />, label: 'Messages' },
  { to: '/admin/members', icon: <Users size={18} />, label: 'Members' },
  { to: '/admin/posts', icon: <FileText size={18} />, label: 'Posts' },
  { to: '/admin/intakes', icon: <Calendar size={18} />, label: 'Intakes' },
  { to: '/admin/applications', icon: <ClipboardList size={18} />, label: 'Applications' },
  { to: '/admin/testimonials', icon: <Star size={18} />, label: 'Testimonials' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('dts_token');
    const userData = localStorage.getItem('dts_user');
    if (!token) {
      navigate('/login');
      return;
    }
    if (userData) {
      try { setUser(JSON.parse(userData)); } catch { /* ignore */ }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('dts_token');
    localStorage.removeItem('dts_user');
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/Logo.png" alt="DTS Logo" className="admin-brand-logo" />
          <span>
            <b>DTS</b>
            <small>Admin Panel</small>
          </span>
        </div>
        <span className="admin-nav-title">Manage</span>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>
      <main className="admin-main">
        <div className="admin-header">
          <div>
            <h1>Dashboard</h1>
            <p className="admin-breadcrumb">DTS Administration</p>
          </div>
          {user && (
            <div className="admin-user-chip">
              <span className="admin-user-initial">{(user.name || user.email || 'A')[0].toUpperCase()}</span>
              <div>
                <b>{user.name}</b>
                <small>{user.role}</small>
              </div>
            </div>
          )}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
