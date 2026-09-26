import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';

export default function StaffLayout({ title, subtitle, navItems }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const activeItem = navItems.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)));

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
      <aside className={`admin-sidebar${navOpen ? ' open' : ''}`} id="workspace-nav">
        <button type="button" className="admin-sidebar-close" onClick={() => setNavOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
        <div className="admin-brand">
          <img src="/Logo.png" alt="DTS Logo" className="admin-brand-logo" />
          <span>
            <b>DTS</b>
            <small>{title}</small>
          </span>
        </div>
        <span className="admin-nav-title">Workspace</span>
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
        <div className="admin-mobile-bar">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={navOpen}
            aria-controls="workspace-nav"
          >
            <Menu size={20} />
          </button>
          <span className="admin-mobile-title">{activeItem?.label || title}</span>
        </div>
        <div className="admin-header">
          <div>
            <h1>{activeItem?.label || title}</h1>
            <p className="admin-breadcrumb">{subtitle}</p>
          </div>
          {user && (
            <div className="admin-user-chip">
              <span className="admin-user-initial">{(user.name || user.email || 'U')[0].toUpperCase()}</span>
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
