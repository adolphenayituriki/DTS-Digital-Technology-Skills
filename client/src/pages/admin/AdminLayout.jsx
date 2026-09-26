import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, FileText, Star, Calendar, ClipboardList, GraduationCap, LogOut, UserCog, ClipboardCheck, Menu, X } from 'lucide-react';
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
  const location = useLocation();
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.role === 'admin');
  const activeItem = visibleNavItems.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)));

  // Navigating away should always leave the drawer closed behind you.
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', onKey);
    // Stop the page behind the drawer from scrolling on touch devices.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {navOpen && <div className="admin-sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <aside className={`admin-sidebar${navOpen ? ' open' : ''}`} id="admin-nav">
        <button type="button" className="admin-sidebar-close" onClick={() => setNavOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
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
        <div className="admin-mobile-bar">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={navOpen}
            aria-controls="admin-nav"
          >
            <Menu size={20} />
          </button>
          <span className="admin-mobile-title">{activeItem?.label || 'Admin Panel'}</span>
        </div>
        <div className="admin-header">
          <div>
            <h1>{activeItem?.label || 'Dashboard'}</h1>
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
