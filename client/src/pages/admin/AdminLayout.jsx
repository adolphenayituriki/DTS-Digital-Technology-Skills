import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, FileText, Star, Calendar, ClipboardList, GraduationCap, LogOut, UserCog, ClipboardCheck } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const navItems = [
  { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
  { to: '/admin/messages', icon: <MessageSquare size={18} />, label: 'Messages' },
  { to: '/admin/members', icon: <Users size={18} />, label: 'Members' },
  { to: '/admin/posts', icon: <FileText size={18} />, label: 'Posts' },
  { to: '/admin/intakes', icon: <Calendar size={18} />, label: 'Intakes' },
  { to: '/admin/applications', icon: <ClipboardList size={18} />, label: 'Applications' },
  { to: '/admin/students', icon: <GraduationCap size={18} />, label: 'Students' },
  { to: '/admin/testimonials', icon: <Star size={18} />, label: 'Testimonials' },
  { to: '/admin/users', icon: <UserCog size={18} />, label: 'User Access', adminOnly: true },
  { to: '/admin/trainer-assignments', icon: <ClipboardCheck size={18} />, label: 'Trainer Assignments', adminOnly: true },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.role === 'admin');

  const handleLogout = () => {
    logout();
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
          {visibleNavItems.map((item) => (
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
